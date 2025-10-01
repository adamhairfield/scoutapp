import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { groupService } from '../services/database';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 cards per row with margins

const GroupsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      let userGroups = [];

      if (user.role === 'coach') {
        // Get groups where user is the leader
        userGroups = await groupService.getLeaderGroups(user.id);
      } else {
        // Get groups where user is a member
        userGroups = await groupService.getUserGroups(user.id);
      }

      console.log('Loaded groups:', userGroups);
      // Sort groups: pinned first, then by creation date
      const sortedGroups = (userGroups || []).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setGroups(sortedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup', { groupType: 'group' });
  };

  const handleCreateTeam = () => {
    navigation.navigate('CreateGroup', { groupType: 'team' });
  };

  const handleViewRequests = (group) => {
    navigation.navigate('GroupRequests', { 
      groupId: group.id, 
      groupName: group.name 
    });
  };

  const handleGroupPress = (group) => {
    navigation.navigate('GroupDetails', { group });
  };

  const handlePinGroup = async (group, event) => {
    // Prevent the group press event from firing
    event.stopPropagation();
    
    try {
      const newPinnedState = !group.is_pinned;
      
      // Update the group in the database
      const result = await groupService.updateGroupPin(group.id, user.id, newPinnedState);
      
      if (result.success) {
        // Update local state
        setGroups(prevGroups => {
          const updatedGroups = prevGroups.map(g => 
            g.id === group.id ? { ...g, is_pinned: newPinnedState } : g
          );
          
          // Sort groups: pinned first, then by creation date
          return updatedGroups.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });
        });
        
        console.log(`Group ${group.name} ${newPinnedState ? 'pinned' : 'unpinned'}`);
      } else {
        Alert.alert('Error', 'Failed to update group pin status');
      }
    } catch (error) {
      console.error('Error pinning group:', error);
      Alert.alert('Error', 'Failed to update group pin status');
    }
  };

  const getGroupGradient = (sport, index) => {
    const gradients = [
      ['#667eea', '#764ba2'], // Purple
      ['#f093fb', '#f5576c'], // Pink
      ['#4facfe', '#00f2fe'], // Blue
      ['#43e97b', '#38f9d7'], // Green
      ['#fa709a', '#fee140'], // Orange-Pink
      ['#a8edea', '#fed6e3'], // Mint
      ['#ff9a9e', '#fecfef'], // Light Pink
      ['#667eea', '#764ba2'], // Purple (repeat)
    ];
    return gradients[index % gradients.length];
  };


  const renderGroupCard = ({ item: group, index }) => {
    console.log('Rendering group:', group.name, 'Cover photo URL:', group.cover_photo_url);
    
    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => handleGroupPress(group)}
      >
        {group.cover_photo_url ? (
        // Show cover photo if available
        <View style={styles.groupImageContainer}>
          <Image 
            source={{ uri: group.cover_photo_url }} 
            style={styles.groupImage}
            resizeMode="cover"
          />
          {/* Overlay for better text readability */}
          <View style={styles.imageOverlay} />
          
          {/* Heart Pin Button */}
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={(event) => handlePinGroup(group, event)}
          >
            <Ionicons 
              name={group.is_pinned ? "heart" : "heart-outline"} 
              size={20} 
              color={group.is_pinned ? "#FF3B30" : "rgba(255, 255, 255, 0.8)"} 
            />
          </TouchableOpacity>
          
          {/* Menu Button */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => handleViewRequests(group)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
          
          {/* Group Info */}
          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={2}>
              {group.name}
            </Text>
            <Text style={styles.groupSport}>
              {group.sport}
            </Text>
          </View>
        </View>
      ) : (
        // Fallback to gradient if no cover photo
        <LinearGradient
          colors={getGroupGradient(group.sport, index)}
          style={styles.groupGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Heart Pin Button */}
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={(event) => handlePinGroup(group, event)}
          >
            <Ionicons 
              name={group.is_pinned ? "heart" : "heart-outline"} 
              size={20} 
              color={group.is_pinned ? "#FF3B30" : "rgba(255, 255, 255, 0.8)"} 
            />
          </TouchableOpacity>
          
          {/* Menu Button */}
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => handleViewRequests(group)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
          
          {/* Group Info */}
          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={2}>
              {group.name}
            </Text>
            <Text style={styles.groupSport}>
              {group.sport}
            </Text>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={80} color={theme.colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Groups Joined
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Join a group to see it here
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('JoinGroup')}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.createButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Join Group</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.createButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Group</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateTeam}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.createButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="trophy" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Team</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} onPress={handleCreateGroup}>
        <Ionicons name="add-circle" size={18} color="#667eea" />
        <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Create Group</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} onPress={handleCreateTeam}>
        <Ionicons name="trophy" size={18} color="#667eea" />
        <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Create Team</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} 
        onPress={() => navigation.navigate('JoinByInvite')}
      >
        <Ionicons name="people" size={18} color="#667eea" />
        <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Join by Code</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <AppHeader 
        navigation={navigation}
        title="Scout."
        rightIcon="menu"
        onRightPress={() => navigation.navigate('Settings')}
        backgroundColor={theme.colors.background}
        textColor={theme.colors.text}
      />

      <FlatList
        data={groups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderActionButtons}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 20,
    gap: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
    paddingTop: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  groupCard: {
    width: cardWidth,
    height: cardWidth * 1.1,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  groupGradient: {
    flex: 1,
    padding: 15,
    position: 'relative',
  },
  groupImageContainer: {
    flex: 1,
    position: 'relative',
  },
  groupImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  heartButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  menuButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    lineHeight: 20,
  },
  groupSport: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default GroupsScreen;
