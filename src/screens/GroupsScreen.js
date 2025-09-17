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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/database';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 cards per row with margins

const GroupsScreen = ({ navigation }) => {
  const { user } = useAuth();
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

      setGroups(userGroups || []);
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
    navigation.navigate('CreateGroup');
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

  const getSportIcon = (sport) => {
    const icons = {
      'Soccer': 'football',
      'Basketball': 'basketball',
      'Baseball': 'baseball',
      'Football': 'american-football',
      'Tennis': 'tennisball',
      'Swimming': 'water',
      'Volleyball': 'basketball', // closest available
      'Hockey': 'ice-cream', // closest available
    };
    return icons[sport] || 'trophy';
  };

  const renderGroupCard = ({ item: group, index }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => handleGroupPress(group)}
    >
      <LinearGradient
        colors={getGroupGradient(group.sport, index)}
        style={styles.groupGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Sport Icon */}
        <View style={styles.sportIconContainer}>
          <Ionicons 
            name={getSportIcon(group.sport)} 
            size={40} 
            color="rgba(255, 255, 255, 0.3)" 
          />
        </View>
        
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
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {user.role === 'coach' ? 'No Groups Created' : 'No Groups Joined'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {user.role === 'coach'
          ? 'Create your first group to get started'
          : 'Join a group to see it here'}
      </Text>
      {user.role === 'coach' ? (
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
      ) : (
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
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Groups</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateGroup}
          >
            <Ionicons name="add" size={20} color="#667eea" />
            <Ionicons name="people" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {user.role === 'coach' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup}>
            <Ionicons name="add-circle" size={20} color="#667eea" />
            <Text style={styles.actionButtonText}>Create Group</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('JoinByInvite')}
        >
          <Ionicons name="people" size={20} color="#667eea" />
          <Text style={styles.actionButtonText}>Join by Invite Code</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>

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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  searchButton: {
    padding: 5,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  sportIconContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
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
