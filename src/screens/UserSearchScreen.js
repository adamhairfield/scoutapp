import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { friendsService } from '../services/friendsService';
import Avatar from '../components/Avatar';

const UserSearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      const result = await friendsService.searchUsers(query.trim(), user.id);
      if (result.success) {
        setSearchResults(result.data);
        setHasSearched(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to search users');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const handleSendFriendRequest = async (targetUser) => {
    try {
      const result = await friendsService.sendFriendRequest(user.id, targetUser.id);
      if (result.success) {
        Alert.alert('Success', `Friend request sent to ${targetUser.name}!`);
        // Update the user's status in the search results
        setSearchResults(prev => 
          prev.map(u => 
            u.id === targetUser.id 
              ? { ...u, friendshipStatus: 'request_sent' }
              : u
          )
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const getFriendshipButton = (targetUser) => {
    switch (targetUser.friendshipStatus) {
      case 'friends':
        return (
          <View style={[styles.statusButton, styles.friendsButton]}>
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={[styles.buttonText, { color: '#34C759' }]}>Friends</Text>
          </View>
        );
      case 'request_sent':
        return (
          <View style={[styles.statusButton, styles.pendingButton]}>
            <Ionicons name="time" size={16} color="#FF9500" />
            <Text style={[styles.buttonText, { color: '#FF9500' }]}>Pending</Text>
          </View>
        );
      case 'request_received':
        return (
          <TouchableOpacity 
            style={[styles.statusButton, styles.acceptButton]}
            onPress={() => navigation.navigate('FriendRequests')}
          >
            <Ionicons name="mail" size={16} color="#007AFF" />
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>Respond</Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity 
            style={[styles.statusButton, styles.addButton]}
            onPress={() => handleSendFriendRequest(targetUser)}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item: targetUser }) => (
    <View style={styles.userItem}>
      <Avatar
        imageUrl={targetUser.profile_picture_url}
        name={targetUser.name}
        size={50}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{targetUser.name}</Text>
        {targetUser.email && (
          <Text style={styles.userEmail}>{targetUser.email}</Text>
        )}
      </View>
      {getFriendshipButton(targetUser)}
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
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : hasSearched && searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with a different name or email
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
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
    marginRight: 34,
  },
  headerSpacer: {
    width: 34,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  listContainer: {
    padding: 20,
  },
  userItem: {
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
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  addButton: {
    backgroundColor: '#667eea',
  },
  friendsButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  pendingButton: {
    backgroundColor: '#fff8f0',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  acceptButton: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UserSearchScreen;
