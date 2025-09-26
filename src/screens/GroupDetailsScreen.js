import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Video } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { feedService, groupService } from '../services/database';
import CreatePostInput from '../components/CreatePostInput';
import CommentsModal from '../components/CommentsModal';
import GroupOptionsModal from '../components/GroupOptionsModal';
import PostOptionsModal from '../components/PostOptionsModal';
import PhotoViewer from '../components/PhotoViewer';
import Avatar from '../components/Avatar';
import ReactionsModal from '../components/ReactionsModal';

// Helper function to get reaction emoji
const getReactionEmoji = (reactionType) => {
  const reactionMap = {
    'love': '❤️',
    'like': '👍',
    'laugh': '😂',
    'wow': '😮',
    'sad': '😢',
    'angry': '😡',
  };
  return reactionMap[reactionType] || '❤️';
};

const GroupDetailsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const { user } = useAuth();
  
  console.log('GroupDetailsScreen - Group data:', group);
  console.log('GroupDetailsScreen - Cover photo URL:', group.cover_photo_url);
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState([]);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [postOptionsModalVisible, setPostOptionsModalVisible] = useState(false);
  const [selectedPostForOptions, setSelectedPostForOptions] = useState(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [selectedPostForReaction, setSelectedPostForReaction] = useState(null);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.log('Group object:', group);
    console.log('Group cover_photo_url:', group.cover_photo_url);
    loadGroupPosts();
    loadGroupMembers();
  }, [group.id]);

  // Handle status bar when screen is focused/unfocused
  useFocusEffect(
    useCallback(() => {
      // Set white status bar when screen is focused
      StatusBar.setBarStyle('light-content');
      
      return () => {
        // Reset to dark status bar when screen is unfocused
        StatusBar.setBarStyle('dark-content');
      };
    }, [])
  );

  const loadGroupMembers = async () => {
    try {
      const result = await groupService.getGroupMembers(group.id);
      if (result.success) {
        setMembers(result.data || []);
        // Count includes the leader + members
        const totalMembers = (result.data || []).length + 1; // +1 for the leader
        setMemberCount(totalMembers);
        console.log('Group members loaded:', result.data?.length || 0, 'Total with leader:', totalMembers);
      } else {
        console.error('Failed to load group members:', result.error);
        // If we can't load members, show at least 1 (the leader)
        setMemberCount(1);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      // If we can't load members, show at least 1 (the leader)
      setMemberCount(1);
    }
  };

  const loadGroupPosts = async () => {
    try {
      const groupPosts = await feedService.getGroupPosts(group.id);
      setPosts(groupPosts);
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
    loadGroupMembers();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreatePost = useCallback(async (postData) => {
    try {
      // Handle both string content (legacy) and object postData (new photo support)
      const finalPostData = typeof postData === 'string' 
        ? {
            group_id: group.id,
            author_id: user.id,
            content: postData,
            post_type: 'text'
          }
        : {
            group_id: group.id,
            author_id: user.id,
            ...postData
          };

      const result = await feedService.createPost(finalPostData);

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
      const currentPost = posts.find(p => p.id === postId);
      
      if (currentPost?.userReaction) {
        // User has a reaction, remove it
        const result = await feedService.removeReaction(postId, user.id);
        if (result.success) {
          setPosts(posts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  liked: false,
                  userReaction: null,
                  likes: Math.max(0, post.likes - 1)
                }
              : post
          ));
          loadGroupPosts(); // Reload for accurate counts
        }
      } else {
        // User has no reaction, add a love reaction
        const result = await feedService.reactToPost(postId, user.id, 'love');
        if (result.success) {
          setPosts(posts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  liked: true,
                  userReaction: 'love',
                  likes: post.likes + 1
                }
              : post
          ));
          loadGroupPosts(); // Reload for accurate counts
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Error', 'Failed to update reaction');
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

  const handleOpenPostOptions = (post) => {
    setSelectedPostForOptions(post);
    setPostOptionsModalVisible(true);
  };

  const handleClosePostOptions = () => {
    setPostOptionsModalVisible(false);
    setSelectedPostForOptions(null);
  };

  const handleDeletePost = async (postId) => {
    try {
      const result = await feedService.deletePost(postId, user.id);
      
      if (result.success) {
        // Remove the post from local state
        setPosts(posts.filter(post => post.id !== postId));
        Alert.alert('Success', 'Post deleted successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const handleEditPost = (post) => {
    // TODO: Implement edit post functionality
    Alert.alert('Info', 'Edit post functionality coming soon!');
  };

  const handleReportPost = async (postId) => {
    try {
      const result = await feedService.reportPost(postId, user.id);
      
      if (result.success) {
        Alert.alert('Success', 'Post reported successfully. Thank you for helping keep our community safe.');
      } else {
        Alert.alert('Error', result.error || 'Failed to report post');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
      Alert.alert('Error', 'Failed to report post');
    }
  };

  const handlePinPost = async (postId) => {
    try {
      const result = await feedService.togglePostPin(postId, user.id);
      
      if (result.success) {
        // Update the post in local state
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, pinned: result.pinned }
            : post
        ));
        
        const action = result.pinned ? 'pinned' : 'unpinned';
        Alert.alert('Success', `Post ${action} successfully`);
        
        // Reload posts to get correct ordering
        loadGroupPosts();
      } else {
        Alert.alert('Error', result.error || 'Failed to pin post');
      }
    } catch (error) {
      console.error('Error pinning post:', error);
      Alert.alert('Error', 'Failed to pin post');
    }
  };

  const handleOpenPhotoViewer = (photos, initialIndex = 0) => {
    setSelectedPhotos(photos);
    setSelectedPhotoIndex(initialIndex);
    setPhotoViewerVisible(true);
  };

  const handleClosePhotoViewer = () => {
    setPhotoViewerVisible(false);
    setSelectedPhotos([]);
    setSelectedPhotoIndex(0);
  };

  const handleLongPressHeart = (post, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedPostForReaction(post);
    setReactionPosition({ x: pageX, y: pageY });
    setReactionsModalVisible(true);
  };

  const handleCloseReactions = () => {
    setReactionsModalVisible(false);
    setSelectedPostForReaction(null);
  };

  const handleReaction = async (reaction) => {
    if (!selectedPostForReaction) return;

    try {
      const result = await feedService.reactToPost(
        selectedPostForReaction.id, 
        user.id, 
        reaction.name
      );
      
      if (result.success) {
        // Update the post in local state
        setPosts(posts.map(post => 
          post.id === selectedPostForReaction.id 
            ? { 
                ...post, 
                liked: true, // For backward compatibility
                userReaction: reaction.name,
                likes: post.totalReactions || post.likes || 0 // Use total reactions if available
              }
            : post
        ));
        
        // Reload posts to get accurate counts
        loadGroupPosts();
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
      Alert.alert('Error', 'Failed to react to post');
    }
  };

  // Extract photos from posts for the Photos tab (only first photo per post)
  const getGroupPhotos = () => {
    const photos = [];
    posts.forEach(post => {
      if (post.photo_urls && post.photo_urls.length > 0) {
        // Only show the first photo, but include count info
        photos.push({
          id: `${post.id}-first`,
          url: post.photo_urls[0],
          postId: post.id,
          postContent: post.content,
          author: post.author,
          timestamp: post.timestamp,
          allPhotos: post.photo_urls,
          photoIndex: 0,
          totalCount: post.photo_urls.length,
          isMultiple: post.photo_urls.length > 1
        });
      } else if (post.photo_url) {
        photos.push({
          id: `${post.id}-single`,
          url: post.photo_url,
          postId: post.id,
          postContent: post.content,
          author: post.author,
          timestamp: post.timestamp,
          allPhotos: [post.photo_url],
          photoIndex: 0,
          totalCount: 1,
          isMultiple: false
        });
      }
    });
    return photos;
  };

  const renderPhotoItem = ({ item: photo }) => (
    <TouchableOpacity
      style={styles.photoGridItem}
      onPress={() => handleOpenPhotoViewer(photo.allPhotos, photo.photoIndex)}
    >
      <Image
        source={{ uri: photo.url }}
        style={styles.photoGridImage}
        resizeMode="cover"
      />
      {photo.isMultiple && (
        <View style={styles.photoCountOverlay}>
          <Ionicons name="copy-outline" size={16} color="#fff" />
          <Text style={styles.photoCountText}>{photo.totalCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const handleInvite = async () => {
    try {
      // Create an invite link
      const result = await groupService.createInviteLink(group.id, user.id);
      
      if (result.success) {
        const inviteToken = result.data.invite_token;
        // Create a web-based invite URL that works for everyone
        const inviteUrl = `https://adamhairfield.github.io/scout-invite/?token=${inviteToken}&group=${encodeURIComponent(group.name)}`;
        const shareText = `Join "${group.name}" on Scout App!\n\nTap this link to join: ${inviteUrl}\n\nThis link will help you download the app if you don't have it yet!`;
        
        // Copy to clipboard
        await Clipboard.setStringAsync(shareText);
        
        Alert.alert(
          'Invite Link Created!',
          'The invite message has been copied to your clipboard. Share it with people you want to invite to this group.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to create invite link');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      Alert.alert('Error', 'Failed to create invite link');
    }
  };

  const renderMemberAvatars = () => {
    const maxAvatars = 3;
    
    // Create array with leader first, then members
    const allMembers = [
      { 
        name: user.name, 
        profile_picture_url: user.profile_picture_url,
        isLeader: true 
      }, // Current user as leader
      ...(members || []).map(member => ({ 
        name: member.profiles?.name || 'Unknown',
        profile_picture_url: member.profiles?.profile_picture_url,
        isLeader: false 
      }))
    ];
    
    const displayMembers = allMembers.slice(0, maxAvatars);
    
    return displayMembers.map((member, index) => (
      <Avatar
        key={index}
        imageUrl={member.profile_picture_url}
        name={member.name}
        size={32}
        showBorder={true}
        borderColor="#fff"
        borderWidth={2}
        style={{
          marginLeft: index > 0 ? -8 : 0
        }}
      />
    ));
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


  const renderPost = ({ item: post }) => {
    return (
      <View style={styles.postContainer}>
        {post.pinned && (
          <View style={styles.pinnedBanner}>
            <Ionicons name="pin" size={16} color="#666" />
            <Text style={styles.pinnedText}>Pinned Post</Text>
          </View>
        )}
        
        <View style={styles.postHeader}>
          <Avatar
            imageUrl={post.author?.profile_picture_url}
            name={post.author?.name}
            size={40}
          />
          <View style={styles.postUserInfo}>
            <Text style={styles.postUserName}>{post.author?.name || 'Unknown User'}</Text>
            <Text style={styles.postTimestamp}>{post.timestamp || 'Unknown time'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.postMenuButton}
            onPress={() => handleOpenPostOptions(post)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.postContent}>{post.content}</Text>
        
        {/* Photo Display */}
        {(post.photo_url || post.photo_urls) && (
          <View style={styles.postPhotosContainer}>
            {post.photo_urls && post.photo_urls.length > 0 ? (
              // Multiple photos
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.postPhotosScroll}
              >
                {post.photo_urls.map((photoUrl, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.postPhotoItem}
                    onPress={() => handleOpenPhotoViewer(post.photo_urls, index)}
                  >
                    <Image 
                      source={{ uri: photoUrl }} 
                      style={styles.postPhoto}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              // Single photo
              <TouchableOpacity onPress={() => handleOpenPhotoViewer([post.photo_url], 0)}>
                <Image 
                  source={{ uri: post.photo_url }} 
                  style={[styles.postPhoto, { width: '100%', marginRight: 0 }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

      {/* Video Display */}
      {post.video_url && (
        <View style={styles.postVideoContainer}>
          <Video
            source={{ uri: post.video_url }}
            style={styles.postVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            isLooping={false}
          />
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => handleLikePost(post.id)}
          onLongPress={(event) => handleLongPressHeart(post, event)}
          delayLongPress={500}
        >
          {post.userReaction ? (
            <Text style={styles.reactionEmoji}>
              {getReactionEmoji(post.userReaction)}
            </Text>
          ) : (
            <Ionicons 
              name={post.liked ? "heart" : "heart-outline"} 
              size={20} 
              color={post.liked ? "#FF3B30" : "#666"} 
            />
          )}
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
              <Avatar
                imageUrl={comment.profiles?.profile_picture_url}
                name={comment.profiles?.name}
                size={24}
                style={styles.commentAvatar}
              />
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
  };

  return (
    <View style={styles.container}>
      {/* Header with cover photo or gradient background */}
      <View style={styles.headerContainer}>
        {group.cover_photo_url ? (
          <>
            <Image 
              source={{ uri: group.cover_photo_url }} 
              style={styles.headerImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Cover photo failed to load:', error);
              }}
            />
            <View style={styles.headerOverlay} />
          </>
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        
        {/* Header Content */}
        <View style={styles.headerContent}>
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
            
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setOptionsModalVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.groupInfo}>
            <View style={styles.groupStats}>
              <View style={styles.memberAvatars}>
                {/* Show actual member avatars */}
                {renderMemberAvatars()}
              </View>
              <View style={styles.statsText}>
                <Text style={styles.memberCount}>
                  {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                </Text>
                <Text style={styles.groupType}>{group.sport || 'Sports Group'}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
              <Ionicons name="add" size={16} color="#667eea" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {renderTabBar()}

      {activeTab === 'Feed' && (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => <CreatePostInput user={user} onCreatePost={handleCreatePost} groupId={group.id} />}
          contentContainerStyle={styles.feedContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab === 'Photos' && (
        <FlatList
          data={getGroupPhotos()}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.photosContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyPhotos}>
              <Ionicons name="images-outline" size={60} color="#ccc" />
              <Text style={styles.emptyPhotosText}>No photos yet</Text>
              <Text style={styles.emptyPhotosSubtext}>Photos from posts will appear here</Text>
            </View>
          )}
        />
      )}

      {activeTab !== 'Feed' && activeTab !== 'Photos' && (
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

      {/* Group Options Modal */}
      <GroupOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        group={group}
        user={user}
        navigation={navigation}
      />

      {/* Post Options Modal */}
      <PostOptionsModal
        visible={postOptionsModalVisible}
        onClose={handleClosePostOptions}
        post={selectedPostForOptions}
        currentUser={user}
        onDeletePost={handleDeletePost}
        onEditPost={handleEditPost}
        onReportPost={handleReportPost}
        onPinPost={handlePinPost}
        isGroupLeader={group?.leader_id === user?.id}
      />

      {/* Photo Viewer */}
      <PhotoViewer
        visible={photoViewerVisible}
        onClose={handleClosePhotoViewer}
        photos={selectedPhotos}
        initialIndex={selectedPhotoIndex}
      />

      {/* Reactions Modal */}
      <ReactionsModal
        visible={reactionsModalVisible}
        onClose={handleCloseReactions}
        onReaction={handleReaction}
        position={reactionPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    position: 'relative',
    height: 200,
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
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
    gap: 12,
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
    color: '#000',
  },
  reactionEmoji: {
    fontSize: 20,
    marginRight: 2,
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
    marginRight: 8,
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
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
  },
  photosContainer: {
    padding: 2,
  },
  photoGridItem: {
    flex: 1,
    margin: 1,
    aspectRatio: 1,
    maxWidth: '33.33%',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  photoCountOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyPhotos: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyPhotosText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    fontWeight: '500',
  },
  emptyPhotosSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'center',
  },
  postPhotosContainer: {
    marginBottom: 15,
  },
  postVideoContainer: {
    marginBottom: 15,
  },
  postVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  postPhotosScroll: {
  },
  postPhotoItem: {
    marginRight: 10,
  },
  postPhoto: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  postSinglePhotoContainer: {
    width: '100%',
  },
  postSinglePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});

export default GroupDetailsScreen;
