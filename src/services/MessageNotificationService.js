import { supabase } from '../config/supabase';
import NotificationService from './NotificationService';

class MessageNotificationService {
  // Send message and trigger notification
  async sendMessageWithNotification(teamId, content, senderId) {
    try {
      // Send the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          team_id: teamId,
          content,
          sender_id: senderId,
        })
        .select('*')
        .single();

      if (messageError) {
        throw messageError;
      }

      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', senderId)
        .single();

      // Get team members (excluding sender)
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, profiles!inner(push_token, notification_preferences)')
        .eq('team_id', teamId)
        .neq('user_id', senderId);

      // Send push notifications to team members
      if (teamMembers && teamMembers.length > 0) {
        const notificationPromises = teamMembers
          .filter(member => {
            // Check if user has notifications enabled for messages
            const prefs = member.profiles.notification_preferences;
            return prefs?.messages !== false && member.profiles.push_token;
          })
          .map(member => 
            NotificationService.notifyNewMessage(
              member.user_id,
              sender?.display_name || 'Someone',
              content,
              teamId
            )
          );

        await Promise.all(notificationPromises);
      }

      return message;
    } catch (error) {
      console.error('Error sending message with notification:', error);
      throw error;
    }
  }

  // Send friend request with notification
  async sendFriendRequestWithNotification(senderId, recipientId) {
    try {
      // Check if friend request already exists
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('sender_id', senderId)
        .eq('recipient_id', recipientId)
        .single();

      if (existing) {
        throw new Error('Friend request already sent');
      }

      // Send friend request
      const { data: request, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', senderId)
        .single();

      // Get recipient notification preferences
      const { data: recipient } = await supabase
        .from('profiles')
        .select('push_token, notification_preferences')
        .eq('id', recipientId)
        .single();

      // Send notification if recipient allows friend request notifications
      if (recipient?.push_token && recipient.notification_preferences?.friend_requests !== false) {
        await NotificationService.notifyFriendRequest(
          recipientId,
          sender?.display_name || 'Someone'
        );
      }

      return request;
    } catch (error) {
      console.error('Error sending friend request with notification:', error);
      throw error;
    }
  }

  // Send team invite with notification
  async sendTeamInviteWithNotification(teamId, inviterId, recipientId) {
    try {
      // Get team info
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      // Get inviter info
      const { data: inviter } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', inviterId)
        .single();

      // Send team invite (you'll need to create this table)
      const { data: invite, error } = await supabase
        .from('team_invites')
        .insert({
          team_id: teamId,
          inviter_id: inviterId,
          recipient_id: recipientId,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Get recipient notification preferences
      const { data: recipient } = await supabase
        .from('profiles')
        .select('push_token, notification_preferences')
        .eq('id', recipientId)
        .single();

      // Send notification if recipient allows team invite notifications
      if (recipient?.push_token && recipient.notification_preferences?.team_invites !== false) {
        await NotificationService.notifyTeamInvite(
          recipientId,
          team?.name || 'A team',
          inviter?.display_name || 'Someone'
        );
      }

      return invite;
    } catch (error) {
      console.error('Error sending team invite with notification:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Get user's notification preferences
  async getNotificationPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      return data?.notification_preferences || {
        messages: true,
        friend_requests: true,
        team_invites: true,
        announcements: true
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        messages: true,
        friend_requests: true,
        team_invites: true,
        announcements: true
      };
    }
  }

  // Mark notifications as read
  async markNotificationsAsRead(userId, notificationIds = []) {
    try {
      let query = supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (notificationIds.length > 0) {
        query = query.in('id', notificationIds);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Get unread notifications
  async getUnreadNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .eq('read', false)
        .order('sent_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }
}

export default new MessageNotificationService();
