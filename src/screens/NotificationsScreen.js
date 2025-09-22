import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../config/supabase';
import AppHeader from '../components/AppHeader';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { unreadCount, markAsRead, markAllAsRead, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // First get notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      // Get sender profile info for notifications that have sender_id
      const notificationsWithSenders = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          if (notification.sender_id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('display_name, profile_picture_url')
              .eq('id', notification.sender_id)
              .single();
            
            return {
              ...notification,
              sender: senderProfile
            };
          }
          return notification;
        })
      );

      setNotifications(notificationsWithSenders);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
    refreshUnreadCount();
  };

  const handleMarkAsRead = async (notificationId) => {
    const success = await markAsRead(notificationId);
    if (success) {
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter(notif => !notif.read)
      .map(notif => notif.id);

    if (unreadIds.length === 0) {
      Alert.alert('Info', 'No unread notifications');
      return;
    }

    const success = await markAllAsRead();
    if (success) {
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      Alert.alert('Success', 'All notifications marked as read');
    } else {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleNotificationPress = (notification) => {
    // Mark as read when tapped
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    const { type, data } = notification;
    
    switch (type) {
      case 'message':
        if (data?.team_id) {
          navigation.navigate('GroupDetails', { groupId: data.team_id });
        }
        break;
      case 'friend_request':
        navigation.navigate('FriendRequests');
        break;
      case 'team_invite':
        navigation.navigate('Groups');
        break;
      default:
        // Just mark as read for unknown types
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'friend_request':
        return 'person-add';
      case 'team_invite':
        return 'people';
      case 'announcement':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return '#007AFF';
      case 'friend_request':
        return '#34C759';
      case 'team_invite':
        return '#FF9500';
      case 'announcement':
        return '#FF3B30';
      default:
        return '#667eea';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(item.type) }
        ]}>
          <Ionicons 
            name={getNotificationIcon(item.type)} 
            size={20} 
            color="#fff" 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.notificationTitle,
            !item.read && styles.unreadText
          ]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.sent_at)}
          </Text>
        </View>
        
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You'll see notifications for messages, friend requests, and team invites here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Ionicons name="checkmark-done" size={24} color="#667eea" />
            </TouchableOpacity>
          )}
        </View>
        
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadBannerText}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : null}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  markAllButton: {
    padding: 8,
  },
  unreadBanner: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  unreadBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationsScreen;
