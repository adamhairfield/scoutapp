import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import NotificationService from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const NotificationTester = () => {
  const { user } = useAuth();
  const [pushToken, setPushToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testBody, setTestBody] = useState('This is a test notification from Scout!');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    initializeNotifications();
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      setAvailableUsers(data || []);
      // Default to current user
      setSelectedUserId(user?.id);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      const token = await NotificationService.initialize();
      setPushToken(token);
      
      const status = await NotificationService.getPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const status = await NotificationService.requestPermissions();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        Alert.alert('Success', 'Notification permissions granted!');
        // Re-initialize to get token
        const token = await NotificationService.initialize();
        setPushToken(token);
      } else {
        Alert.alert('Permission Denied', 'Notification permissions were not granted.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const sendLocalNotification = async () => {
    try {
      // Create database notification first
      const dbSuccess = await createDatabaseNotification(
        'announcement',
        testTitle,
        testBody,
        { type: 'test', timestamp: Date.now() }
      );

      if (dbSuccess) {
        // Then send local notification
        await NotificationService.sendLocalNotification(
          testTitle,
          testBody,
          { type: 'test', timestamp: Date.now() }
        );
        Alert.alert('Success', 'Notification created! Check both local notification and notifications page.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const sendTestMessage = async () => {
    try {
      // Create database notification
      const dbSuccess = await createDatabaseNotification(
        'message',
        'New Message from John',
        'Hey! Are you ready for practice tomorrow?',
        { type: 'message', team_id: 'test-team', sender_name: 'John' }
      );

      if (dbSuccess) {
        // Send local notification
        await NotificationService.sendLocalNotification(
          'New Message from John',
          'Hey! Are you ready for practice tomorrow?',
          { type: 'message', teamId: 'test-team', senderId: 'john' }
        );
        Alert.alert('Success', 'Test message notification created! Check notifications page.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test message');
    }
  };

  const sendTestFriendRequest = async () => {
    try {
      // Create database notification
      const dbSuccess = await createDatabaseNotification(
        'friend_request',
        'New Friend Request',
        'Sarah wants to be your friend',
        { type: 'friend_request', sender_name: 'Sarah' }
      );

      if (dbSuccess) {
        // Send local notification
        await NotificationService.sendLocalNotification(
          'New Friend Request',
          'Sarah wants to be your friend',
          { type: 'friend_request', senderName: 'Sarah' }
        );
        Alert.alert('Success', 'Test friend request notification created! Check notifications page.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test friend request');
    }
  };

  const sendTestTeamInvite = async () => {
    try {
      // Create database notification
      const dbSuccess = await createDatabaseNotification(
        'team_invite',
        'Team Invitation',
        'Coach Mike invited you to join Eagles Basketball',
        { type: 'team_invite', team_name: 'Eagles Basketball', inviter_name: 'Coach Mike' }
      );

      if (dbSuccess) {
        // Send local notification
        await NotificationService.sendLocalNotification(
          'Team Invitation',
          'Coach Mike invited you to join Eagles Basketball',
          { type: 'team_invite', teamName: 'Eagles Basketball', inviterName: 'Coach Mike' }
        );
        Alert.alert('Success', 'Test team invite notification created! Check notifications page.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send test team invite');
    }
  };

  const clearAllNotifications = async () => {
    try {
      await NotificationService.clearAllNotifications();
      Alert.alert('Success', 'All notifications cleared!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear notifications');
    }
  };

  const setBadgeCount = async (count) => {
    try {
      await NotificationService.setBadgeCount(count);
      Alert.alert('Success', `Badge count set to ${count}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set badge count');
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) {
      Alert.alert('Error', 'No token to copy');
      return;
    }
    
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', 'Push token copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy token');
    }
  };

  // Create a database notification that will show up in notifications page
  const createDatabaseNotification = async (type, title, body, data = {}) => {
    if (!user || !selectedUserId) {
      Alert.alert('Error', 'Please select a user to send notification to');
      return false;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: selectedUserId,
          sender_id: user.id, // Current user as sender
          type,
          title,
          body,
          data,
        });

      if (error) {
        console.error('Error creating notification:', error);
        Alert.alert('Error', 'Failed to create notification in database');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      Alert.alert('Error', 'Failed to create notification');
      return false;
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return '#4CAF50';
      case 'denied': return '#F44336';
      default: return '#FF9800';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 Notification Tester</Text>
      
      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusItem}>
          <Text style={styles.label}>Permission Status:</Text>
          <Text style={[styles.status, { color: getPermissionStatusColor() }]}>
            {permissionStatus.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.tokenContainer} 
          onPress={() => copyToClipboard(pushToken)}
          disabled={!pushToken}
        >
          <Text style={styles.label}>Push Token (tap to copy):</Text>
          <Text style={styles.tokenText} numberOfLines={3}>
            {pushToken || 'Not available'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Permissions Section */}
      {permissionStatus !== 'granted' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Request Permissions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Recipient</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userSelector}>
          {availableUsers.map((availableUser) => (
            <TouchableOpacity
              key={availableUser.id}
              style={[
                styles.userButton,
                selectedUserId === availableUser.id && styles.selectedUserButton
              ]}
              onPress={() => setSelectedUserId(availableUser.id)}
            >
              <Text style={[
                styles.userButtonText,
                selectedUserId === availableUser.id && styles.selectedUserButtonText
              ]}>
                {availableUser.name || availableUser.email}
                {availableUser.id === user?.id && ' (You)'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Custom Test Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Test</Text>
        <TextInput
          style={styles.input}
          placeholder="Notification Title"
          value={testTitle}
          onChangeText={setTestTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Notification Body"
          value={testBody}
          onChangeText={setTestBody}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={sendLocalNotification}>
          <Text style={styles.buttonText}>Send Custom Notification</Text>
        </TouchableOpacity>
      </View>

      {/* Predefined Tests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Predefined Tests</Text>
        <TouchableOpacity style={styles.button} onPress={sendTestMessage}>
          <Text style={styles.buttonText}>💬 Test Message Notification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={sendTestFriendRequest}>
          <Text style={styles.buttonText}>👥 Test Friend Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={sendTestTeamInvite}>
          <Text style={styles.buttonText}>🏆 Test Team Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Badge Tests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Badge Tests</Text>
        <View style={styles.badgeRow}>
          <TouchableOpacity style={styles.badgeButton} onPress={() => setBadgeCount(1)}>
            <Text style={styles.buttonText}>Badge: 1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.badgeButton} onPress={() => setBadgeCount(5)}>
            <Text style={styles.buttonText}>Badge: 5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.badgeButton} onPress={() => setBadgeCount(0)}>
            <Text style={styles.buttonText}>Clear Badge</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Utility Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utilities</Text>
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearAllNotifications}>
          <Text style={styles.buttonText}>Clear All Notifications</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Test notifications work best on physical devices. 
          Some features may not work in simulators.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  token: {
    fontSize: 12,
    color: '#666',
    flex: 2,
    textAlign: 'right',
  },
  tokenContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginTop: 4,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeButton: {
    backgroundColor: '#667eea',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
    lineHeight: 20,
  },
  userSelector: {
    marginTop: 10,
  },
  userButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedUserButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  userButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedUserButtonText: {
    color: '#fff',
  },
});

export default NotificationTester;
