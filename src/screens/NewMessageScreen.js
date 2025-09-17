import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { messageService } from '../services/database';

const NewMessageScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log('Loading contacts for user:', user.id, 'role:', user.role);
      const messagableContacts = await messageService.getMessagableContacts(user.id, user.role);
      console.log('Loaded contacts:', messagableContacts);
      setContacts(messagableContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !messageText.trim()) {
      Alert.alert('Error', 'Please select a contact and enter a message');
      return;
    }

    try {
      const messageData = {
        sender_id: user.id,
        recipient_id: selectedContact.id,
        content: messageText.trim(),
        message_type: 'direct'
      };

      const result = await messageService.sendMessage(messageData);
      
      if (result.success) {
        Alert.alert('Success', 'Message sent!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        selectedContact?.id === item.id && styles.selectedContact
      ]}
      onPress={() => setSelectedContact(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {item.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactRole}>
          {item.role === 'parent' ? 'Parent' : 'Coach'}
        </Text>
      </View>
      {selectedContact?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#667eea" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity
          style={[styles.sendButton, (!selectedContact || !messageText.trim()) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!selectedContact || !messageText.trim()}
        >
          <Text style={[styles.sendButtonText, (!selectedContact || !messageText.trim()) && styles.sendButtonTextDisabled]}>
            Send
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          {user.role === 'coach' ? 'Select Parent to Message:' : 'Select Coach to Message:'}
        </Text>
        
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id.toString()}
          style={styles.contactsList}
          showsVerticalScrollIndicator={false}
        />

        {selectedContact && (
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>
              Message to {selectedContact.name}:
            </Text>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message here..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  contactsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedContact: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 14,
    color: '#666',
  },
  messageSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#f8f9fa',
  },
});

export default NewMessageScreen;
