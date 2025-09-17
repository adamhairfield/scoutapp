import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
  RefreshControl,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { feedService, groupService } from '../services/database';
import CreatePostInput from '../components/CreatePostInput';
import CommentsModal from '../components/CommentsModal';

const GroupDetailsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadGroupPosts();
  }, []);

  const loadGroupPosts = async () => {
    try {
      const groupPosts = await feedService.getGroupPosts(group.id);
      
      // Transform the data to match our component structure
      const transformedPosts = groupPosts.map(post => ({
        id: post.id,
        author: {
          id: post.author_id,
          name: post.author_name,
          role: post.author_role
        },
        content: post.content,
        timestamp: formatTimestamp(post.created_at),
        likes: post.like_count,
        comments: post.recent_comments || [],
        commentCount: post.comment_count || 0,
        liked: post.user_liked,
        type: post.post_type,
        pinned: post.is_pinned
      }));
      
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading group posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroupPosts();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreatePost = useCallback(async (content) => {
    try {
      const result = await feedService.createPost({
        group_id: group.id,
        author_id: user.id,
        content: content,
        post_type: 'text'
      });

      if (result.success) {
        loadGroupPosts(); // Reload posts to show the new one
        Alert.alert('Success', 'Post created successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  }, [group.id, user.id]);

  const handleLikePost = async (postId) => {
    try {
      const result = await feedService.togglePostLike(postId, user.id);
      
      if (result.success) {
        // Update the local state optimistically
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                liked: result.liked, 
                likes: result.liked ? post.likes + 1 : post.likes - 1 
              }
            : post
        ));
      } else {
        Alert.alert('Error', result.error || 'Failed to like post');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleOpenComments = (post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
  };

  const handleInvite = async () => {
    try {
      // Create an invite link
      const result = await groupService.createInviteLink(group.id, user.id);
      
      if (result.success) {
        const inviteToken = result.data.invite_token;
        const inviteUrl = `scoutapp://invite/${inviteToken}`;
        const shareText = `Join "${group.name}" on Scout App!\n\nTap this link to join: ${inviteUrl}\n\nOr download Scout App and use invite code: ${inviteToken}`;
        
        // Copy to clipboard
        Clipboard.setString(shareText);
        
        Alert.alert(
          'Invite Link Created!',
          'The invite message has been copied to your clipboard. Share it with people you want to invite to this group.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create invite link');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      Alert.alert('Error', 'Failed to create invite link');
    }
  };

  const tabs = ['Feed', 'Photos', 'About', 'Members'];

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );


  const renderPost = ({ item: post }) => (
    <View style={styles.postContainer}>
      {post.pinned && (
        <View style={styles.pinnedBanner}>
          <Ionicons name="pin" size={16} color="#666" />
          <Text style={styles.pinnedText}>Pinned Post</Text>
        </View>
      )}
      
      <View style={styles.postHeader}>
        <View style={styles.postUserAvatar}>
          <Text style={styles.postAvatarText}>
            {post.author.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.postUserInfo}>
          <Text style={styles.postUserName}>{post.author.name}</Text>
          <Text style={styles.postTimestamp}>{post.timestamp}</Text>
        </View>
        <TouchableOpacity style={styles.postMenuButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.postContent}>{post.content}</Text>
      
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => handleLikePost(post.id)}
        >
          <Ionicons 
            name={post.liked ? "heart" : "heart-outline"} 
            size={20} 
            color={post.liked ? "#FF3B30" : "#666"} 
          />
          <Text style={[styles.actionCount, post.liked && styles.likedText]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => handleOpenComments(post)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="share-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      {post.comments.length > 0 && (
        <View style={styles.commentsSection}>
          {post.comments.slice(0, 3).map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {comment.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.commentBubble}>
                <Text style={styles.commentAuthor}>{comment.profiles?.name}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
              <Text style={styles.commentTime}>{formatTimestamp(comment.created_at)}</Text>
            </View>
          ))}
          {post.commentCount > 3 && (
            <TouchableOpacity 
              style={styles.viewMoreComments}
              onPress={() => handleOpenComments(post)}
            >
              <Text style={styles.viewMoreText}>
                View {post.commentCount > 5 ? 'all' : 'more'} {post.commentCount} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with gradient background */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.groupInfo}>
          <View style={styles.groupStats}>
            <View style={styles.memberAvatars}>
              {/* Mock member avatars */}
              <View style={[styles.memberAvatar, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.memberAvatarText}>S</Text>
              </View>
              <View style={[styles.memberAvatar, { backgroundColor: '#4ECDC4', marginLeft: -8 }]}>
                <Text style={styles.memberAvatarText}>M</Text>
              </View>
              <View style={[styles.memberAvatar, { backgroundColor: '#45B7D1', marginLeft: -8 }]}>
                <Text style={styles.memberAvatarText}>J</Text>
              </View>
            </View>
            <View style={styles.statsText}>
              <Text style={styles.memberCount}>{group.member_count || 12} Members</Text>
              <Text style={styles.groupType}>Sports Group</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
            <Ionicons name="add" size={16} color="#667eea" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {renderTabBar()}

      {activeTab === 'Feed' && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => <CreatePostInput user={user} onCreatePost={handleCreatePost} />}
          contentContainerStyle={styles.feedContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab !== 'Feed' && (
        <View style={styles.comingSoon}>
          <Ionicons name="construct" size={60} color="#ccc" />
          <Text style={styles.comingSoonText}>{activeTab} Coming Soon</Text>
        </View>
      )}

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={handleCloseComments}
        post={selectedPost}
        user={user}
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
    paddingTop: 60, // More space for status bar and breathing room
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  searchButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 5,
  },
  groupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsText: {
    alignItems: 'flex-start',
  },
  memberCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupType: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  inviteButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteButtonText: {
    color: '#667eea',
    fontWeight: '600',
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
  feedContainer: {
    paddingBottom: 20,
  },
  createPostContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  pinnedText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postMenuButton: {
    padding: 5,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 15,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    color: '#666',
    fontSize: 14,
  },
  likedText: {
    color: '#FF3B30',
  },
  commentsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
    marginTop: 4,
  },
  viewMoreComments: {
    paddingVertical: 8,
    paddingLeft: 32,
  },
  viewMoreText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
});

export default GroupDetailsScreen;
