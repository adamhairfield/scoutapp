import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';
import NotificationService from '../services/NotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const cleanup = setupRealtimeSubscription();
      
      // Return cleanup function
      return cleanup;
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error loading unread count:', error);
        return;
      }

      const count = data?.length || 0;
      setUnreadCount(count);
      
      // Update app badge
      await NotificationService.setBadgeCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          // Update app badge
          NotificationService.setBadgeCount(unreadCount + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification updated:', payload);
          // Reload unread count when notifications are marked as read
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      // Update local count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update app badge
      const newCount = Math.max(0, unreadCount - 1);
      await NotificationService.setBadgeCount(newCount);
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return false;
      }

      // Reset counts
      setUnreadCount(0);
      await NotificationService.setBadgeCount(0);
      
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  };

  const refreshUnreadCount = () => {
    loadUnreadCount();
  };

  const value = {
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
