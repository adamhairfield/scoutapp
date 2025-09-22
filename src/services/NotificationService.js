import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize notification service
  async initialize() {
    try {
      // Register for push notifications
      this.expoPushToken = await this.registerForPushNotificationsAsync();
      
      if (this.expoPushToken) {
        console.log('Push token:', this.expoPushToken);
        // Store token in user profile
        await this.storePushToken(this.expoPushToken);
      }

      // Set up notification listeners
      this.setupNotificationListeners();
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#667eea',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e) {
        token = `${e}`;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  // Store push token in user profile
  async storePushToken(token) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error storing push token:', error);
        }
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle foreground notification display
      this.handleForegroundNotification(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification received in foreground
  handleForegroundNotification(notification) {
    const { title, body, data } = notification.request.content;
    
    // You can customize how foreground notifications are displayed
    // For example, show a custom in-app notification banner
    console.log(`Foreground notification: ${title} - ${body}`);
  }

  // Handle notification tap
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    // Navigate based on notification type
    if (data?.type === 'message') {
      // Navigate to messages screen
      console.log('Navigate to messages');
    } else if (data?.type === 'friend_request') {
      // Navigate to friends screen
      console.log('Navigate to friends');
    } else if (data?.type === 'team_invite') {
      // Navigate to teams screen
      console.log('Navigate to teams');
    }
  }

  // Send local notification (for testing)
  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: { seconds: 1 },
    });
  }

  // Send push notification to specific user
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // Get user's push token
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      if (error || !profile?.push_token) {
        console.log('No push token found for user:', userId);
        return false;
      }

      // Send via Expo Push API
      const message = {
        to: profile.push_token,
        sound: 'default',
        title,
        body,
        data,
        badge: 1,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Push notification sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send notification for new message
  async notifyNewMessage(recipientId, senderName, messageText, teamId) {
    const title = `New message from ${senderName}`;
    const body = messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText;
    
    await this.sendPushNotification(recipientId, title, body, {
      type: 'message',
      teamId,
      senderId: senderName,
    });
  }

  // Send notification for friend request
  async notifyFriendRequest(recipientId, senderName) {
    const title = 'New Friend Request';
    const body = `${senderName} wants to be your friend`;
    
    await this.sendPushNotification(recipientId, title, body, {
      type: 'friend_request',
      senderName,
    });
  }

  // Send notification for team invite
  async notifyTeamInvite(recipientId, teamName, inviterName) {
    const title = 'Team Invitation';
    const body = `${inviterName} invited you to join ${teamName}`;
    
    await this.sendPushNotification(recipientId, title, body, {
      type: 'team_invite',
      teamName,
      inviterName,
    });
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Get notification permissions status
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Request notification permissions
  async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Export singleton instance
export default new NotificationService();
