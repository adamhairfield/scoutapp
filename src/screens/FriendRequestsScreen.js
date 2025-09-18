import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { friendsService } from '../services/friendsService';
import Avatar from '../components/Avatar';

const FriendRequestsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received');
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFriendRequests();
  }, []);

  const loadFriendRequests = async () => {
    setLoading(true);
    try {
      const [receivedResult, sentResult] = await Promise.all([
        friendsService.getReceivedFriendRequests(user.id),
        friendsService.getSentFriendRequests(user.id)
      ]);

      if (receivedResult.success) {
        setReceivedRequests(receivedResult.data);
      }
      if (sentResult.success) {
        setSentRequests(sentResult.data);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
      Alert.alert('Error', 'Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFriendRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request) => {
    try {
      const result = await friendsService.acceptFriendRequest(request.id);
      if (result.success) {
        Alert.alert('Success', `You are now friends with ${request.sender.name}!`);
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
      } else {
        Alert.alert('Error', result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (request) => {
    Alert.alert(
      'Decline Friend Request',
      `Are you sure you want to decline ${request.sender.name}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await friendsService.declineFriendRequest(request.id);
              if (result.success) {
                setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
              } else {
                Alert.alert('Error', result.error || 'Failed to decline request');
              }
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async (request) => {
    Alert.alert(
      'Cancel Friend Request',
      `Cancel your friend request to ${request.receiver.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await friendsService.cancelFriendRequest(request.id);
              if (result.success) {
                setSentRequests(prev => prev.filter(r => r.id !== request.id));
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel request');
              }
            } catch (error) {
              console.error('Error canceling request:', error);
              Alert.alert('Error', 'Failed to cancel request');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const renderReceivedRequest = ({ item: request }) => (
    <View style={styles.requestItem}>
      <Avatar
        imageUrl={request.sender.profile_picture_url}
        name={request.sender.name}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.sender.name}</Text>
        <Text style={styles.requestTime}>{formatTimeAgo(request.sent_at)}</Text>
        {request.message && (
          <Text style={styles.requestMessage}>"{request.message}"</Text>
        )}
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(request)}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleDeclineRequest(request)}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequest = ({ item: request }) => (
    <View style={styles.requestItem}>
      <Avatar
        imageUrl={request.receiver.profile_picture_url}
        name={request.receiver.name}
        size={50}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.receiver.name}</Text>
        <Text style={styles.requestTime}>Sent {formatTimeAgo(request.sent_at)}</Text>
        {request.message && (
          <Text style={styles.requestMessage}>"{request.message}"</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.cancelButton]}
        onPress={() => handleCancelRequest(request)}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'received' ? 'mail-outline' : 'paper-plane-outline'} 
        size={60} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'received' ? 'No friend requests' : 'No sent requests'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'received' 
          ? 'Friend requests will appear here'
          : 'Requests you send will appear here'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Requests</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('UserSearch')}
        >
          <Ionicons name="person-add" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received ({receivedRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'received' ? receivedRequests : sentRequests}
        renderItem={activeTab === 'received' ? renderReceivedRequest : renderSentRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  searchButton: {
    padding: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 15,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  requestRole: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    width: 'auto',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FriendRequestsScreen;
