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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { friendsService } from '../services/friendsService';
import { groupService } from '../services/database';
import { supabase } from '../config/supabase';
import Avatar from '../components/Avatar';

const SearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const checkGroupMembership = async (groupId) => {
    try {
      // Check if user is a member
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('player_id', user.id)
        .maybeSingle();

      if (membership) {
        return 'member';
      }

      // Check for pending join request
      const { data: request } = await supabase
        .from('group_join_requests')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (request) {
        return 'request_sent';
      }

      return 'none';
    } catch (error) {
      console.error('Error checking group membership:', error);
      return 'none';
    }
  };

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'people') {
        const result = await friendsService.searchUsers(query.trim(), user.id);
        if (result.success) {
          setSearchResults(result.data);
          setHasSearched(true);
        } else {
          Alert.alert('Error', result.error || 'Failed to search users');
        }
      } else {
        // Search for public groups
        const result = await groupService.searchPublicGroups(query.trim());
        if (result.success) {
          console.log('Group search results:', result.data);
          // Check membership status for each group
          const groupsWithStatus = await Promise.all(
            result.data.map(async (group) => {
              console.log('Group cover photo URL:', group.cover_photo_url);
              const membershipStatus = await checkGroupMembership(group.id);
              return {
                ...group,
                membershipStatus
              };
            })
          );
          setSearchResults(groupsWithStatus);
          setHasSearched(true);
        } else {
          Alert.alert('Error', result.error || 'Failed to search groups');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  }, [activeTab, user.id]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchResults([]);
    setHasSearched(false);
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

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

  const handleJoinGroup = async (group) => {
    try {
      const result = await groupService.requestToJoinGroup(group.id, user.id);
      if (result.success) {
        Alert.alert('Success', `Join request sent to ${group.name}!`);
        // Update the group's status in the search results
        setSearchResults(prev => 
          prev.map(g => 
            g.id === group.id 
              ? { ...g, membershipStatus: 'request_sent' }
              : g
          )
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send join request');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to send join request');
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

  const getGroupButton = (group) => {
    switch (group.membershipStatus) {
      case 'member':
        return (
          <TouchableOpacity 
            style={[styles.statusButton, styles.friendsButton]}
            onPress={() => navigation.navigate('GroupDetails', { group })}
          >
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={[styles.buttonText, { color: '#34C759' }]}>Member</Text>
          </TouchableOpacity>
        );
      case 'request_sent':
        return (
          <View style={[styles.statusButton, styles.pendingButton]}>
            <Ionicons name="time" size={16} color="#FF9500" />
            <Text style={[styles.buttonText, { color: '#FF9500' }]}>Pending</Text>
          </View>
        );
      default:
        return (
          <TouchableOpacity 
            style={[styles.statusButton, styles.addButton]}
            onPress={() => handleJoinGroup(group)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>Join</Text>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item: targetUser }) => (
    <View style={styles.resultItem}>
      <Avatar
        imageUrl={targetUser.profile_picture_url}
        name={targetUser.name}
        size={50}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{targetUser.name}</Text>
        {targetUser.email && (
          <Text style={styles.itemEmail}>{targetUser.email}</Text>
        )}
      </View>
      {getFriendshipButton(targetUser)}
    </View>
  );

  const renderGroupItem = ({ item: group }) => (
    <View style={styles.resultItem}>
      <View style={styles.groupImageContainer}>
        {group.cover_photo_url ? (
          <Image 
            source={{ uri: group.cover_photo_url }}
            style={styles.groupImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.groupIcon}>
            <Ionicons name="people" size={30} color="#667eea" />
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{group.name}</Text>
        <Text style={styles.itemSubtitle}>{group.sport}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {group.description}
        </Text>
        <Text style={styles.memberCount}>
          {group.member_count || 1} members
        </Text>
      </View>
      {getGroupButton(group)}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'people' ? 'people-outline' : 'search-outline'} 
        size={60} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        {hasSearched 
          ? `No ${activeTab === 'people' ? 'users' : 'groups'} found`
          : `Search for ${activeTab === 'people' ? 'friends' : 'groups'}`
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {hasSearched 
          ? `Try searching with different ${activeTab === 'people' ? 'name or email' : 'keywords'}`
          : `Type in the search bar to find ${activeTab === 'people' ? 'people to add as friends' : 'groups to join'}`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity
          style={styles.requestsButton}
          onPress={() => navigation.navigate('FriendRequests')}
        >
          <Ionicons name="mail-outline" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.activeTab]}
          onPress={() => handleTabChange('people')}
        >
          <Ionicons 
            name={activeTab === 'people' ? 'people' : 'people-outline'} 
            size={20} 
            color={activeTab === 'people' ? '#667eea' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
            People
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => handleTabChange('groups')}
        >
          <Ionicons 
            name={activeTab === 'groups' ? 'flag' : 'flag-outline'} 
            size={20} 
            color={activeTab === 'groups' ? '#667eea' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'people' ? 'Search by name or email...' : 'Search groups...'}
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
        ) : (
          <FlatList
            data={searchResults}
            renderItem={activeTab === 'people' ? renderUserItem : renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  requestsButton: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  resultItem: {
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
  groupImageContainer: {
    width: 50,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
  },
  groupImage: {
    width: 50,
    height: 70,
    borderRadius: 8,
  },
  groupIcon: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 2,
  },
  itemEmail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  memberCount: {
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

export default SearchScreen;
