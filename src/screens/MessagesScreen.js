import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messageService } from '../services/database';
import Avatar from '../components/Avatar';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await messageService.getUserConversations(user.id);
      
      // Format conversations for display
      const formattedConversations = userConversations.map(conv => ({
        id: conv.id,
        partnerId: conv.id,
        name: conv.partner.name,
        lastMessage: conv.lastMessage,
        timestamp: new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: conv.unread,
        profilePictureUrl: conv.partner.profile_picture_url,
        partner: conv.partner
      }));
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const loadMessages = async (conversation) => {
    try {
      const result = await messageService.getDirectMessages(user.id, conversation.partnerId);
      
      if (!result.success) {
        console.error('Error loading messages:', result.error);
        Alert.alert('Error', 'Failed to load messages');
        return;
      }
      
      const directMessages = result.data || [];
      
      // Format messages for display
      const formattedMessages = directMessages.map(msg => ({
        id: msg.id.toString(),
        text: msg.content,
        sender: msg.sender_id === user.id ? 'me' : 'other',
        timestamp: new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const messageData = {
        sender_id: user.id,
        recipient_id: selectedConversation.partnerId,
        content: newMessage.trim(),
        message_type: 'direct'
      };

      const result = await messageService.sendMessage(messageData);
      
      if (result.success) {
        // Add message to local state immediately for better UX
        const message = {
          id: result.data.id.toString(),
          text: newMessage,
          sender: 'me',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages([...messages, message]);
        setNewMessage('');
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const ConversationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => {
        setSelectedConversation(item);
        loadMessages(item);
      }}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          imageUrl={item.profilePictureUrl}
          name={item.name}
          size={50}
        />
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const MessageItem = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'me' ? styles.myMessage : styles.otherMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'me' ? styles.myMessageText : styles.otherMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={styles.messageTime}>{item.timestamp}</Text>
    </View>
  );

  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConversation(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.chatHeaderCenter}>
            <Avatar
              imageUrl={selectedConversation.profilePictureUrl}
              name={selectedConversation.name}
              size={32}
            />
            <Text style={styles.chatTitle}>{selectedConversation.name}</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={24} color="#667eea" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageItem item={item} />}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity 
          style={styles.newMessageButton}
          onPress={() => navigation.navigate('NewMessage')}
        >
          <Ionicons name="create" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem item={item} />}
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  newMessageButton: {
    padding: 5,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  chatHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  callButton: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
    borderRadius: 18,
    borderBottomRightRadius: 5,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MessagesScreen;
