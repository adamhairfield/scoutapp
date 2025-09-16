import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeedData();
  }, []);

  const loadFeedData = () => {
    // Simulate loading feed data
    const mockPosts = [
      {
        id: '1',
        type: 'announcement',
        title: 'Practice Schedule Update',
        content: 'Tomorrow\'s practice has been moved to 4:00 PM due to field maintenance.',
        author: 'Coach Johnson',
        timestamp: '2 hours ago',
        teamName: 'Eagles U12',
      },
      {
        id: '2',
        type: 'achievement',
        title: 'Player Spotlight',
        content: 'Congratulations to Sarah M. for scoring the winning goal in yesterday\'s match!',
        author: 'Coach Martinez',
        timestamp: '5 hours ago',
        teamName: 'Lions U14',
      },
      {
        id: '3',
        type: 'event',
        title: 'Upcoming Tournament',
        content: 'Regional championship registration is now open. Deadline: March 15th.',
        author: 'League Admin',
        timestamp: '1 day ago',
        teamName: 'All Teams',
      },
    ];
    setPosts(mockPosts);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getPostIcon = (type) => {
    switch (type) {
      case 'announcement':
        return 'megaphone';
      case 'achievement':
        return 'trophy';
      case 'event':
        return 'calendar';
      default:
        return 'information-circle';
    }
  };

  const getPostColor = (type) => {
    switch (type) {
      case 'announcement':
        return '#FF6B35';
      case 'achievement':
        return '#FFD700';
      case 'event':
        return '#45B7D1';
      default:
        return '#666';
    }
  };

  const PostCard = ({ post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.postIcon, { backgroundColor: getPostColor(post.type) + '20' }]}>
          <Ionicons name={getPostIcon(post.type)} size={20} color={getPostColor(post.type)} />
        </View>
        <View style={styles.postInfo}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postMeta}>{post.author} • {post.teamName}</Text>
        </View>
        <Text style={styles.postTime}>{post.timestamp}</Text>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionButtons}>
        {user.role === 'coach' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}
              onPress={() => navigation.navigate('CreateTeam')}
            >
              <Ionicons name="people" size={24} color="#fff" />
              <Text style={styles.actionText}>Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#4ECDC4' }]}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <Text style={styles.actionText}>Messages</Text>
            </TouchableOpacity>
          </>
        )}
        {user.role === 'player' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#45B7D1' }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person" size={24} color="#fff" />
            <Text style={styles.actionText}>My Profile</Text>
          </TouchableOpacity>
        )}
        {user.role === 'parent' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9B59B6' }]}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubbles" size={24} color="#fff" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color="#667eea" />
          </TouchableOpacity>
        </View>

        <QuickActions />

        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Team Feed</Text>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  profileButton: {
    padding: 5,
  },
  quickActions: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  feedSection: {
    margin: 15,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default HomeScreen;
