import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  RefreshControl 
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import CreatePostInput from './CreatePostInput';
import Avatar from './Avatar';

// Helper function to get reaction emoji
const getReactionEmoji = (reactionType) => {
  const reactionMap = {
    'love': '❤️',
    'like': '👍',
    'laugh': '😂',
    'wow': '😮',
    'sad': '😢',
    'angry': '😡',
    'celebrate': '🎉'
  };
  return reactionMap[reactionType] || '👍';
};

const formatTimestamp = (timestamp) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const FeedTab = ({ 
  posts, 
  user, 
  group, 
  refreshing, 
  onRefresh, 
  onCreatePost, 
  onLikePost, 
  onOpenComments, 
  onOpenPostOptions,
  onOpenPhotoViewer,
  onLongPressHeart,
  styles,
  theme 
}) => {
  const renderPost = ({ item: post }) => (
    <View style={[styles.postContainer, { backgroundColor: theme?.colors.surface || '#fff' }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Avatar
          imageUrl={post.author?.profile_picture_url}
          name={post.author?.name}
          size={40}
          style={styles.postAuthorAvatar}
        />
        <View style={styles.postAuthorInfo}>
          <Text style={[styles.postAuthorName, { color: theme?.colors.text || '#333' }]}>{post.author?.name}</Text>
          <Text style={[styles.postTimestamp, { color: theme?.colors.textSecondary || '#666' }]}>{formatTimestamp(post.created_at)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.postOptionsButton}
          onPress={() => onOpenPostOptions(post)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme?.colors.textSecondary || '#666'} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.postContent, { color: theme?.colors.text || '#333' }]}>{post.content}</Text>
      
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
                  onPress={() => onOpenPhotoViewer(post.photo_urls, index)}
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
            <TouchableOpacity onPress={() => onOpenPhotoViewer([post.photo_url], 0)}>
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

      <View style={[styles.postActions, { borderTopColor: theme?.colors.border || '#f0f0f0' }]}>
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => onLikePost(post.id)}
          onLongPress={(event) => onLongPressHeart(post, event)}
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
              color={post.liked ? "#FF3B30" : (theme?.colors.textSecondary || '#666')} 
            />
          )}
          <Text style={[styles.actionCount, { color: theme?.colors.textSecondary || '#666' }, post.liked && styles.likedText]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.postAction}
          onPress={() => onOpenComments(post)}
        >
          <Ionicons name="chatbubble-outline" size={20} color={theme?.colors.textSecondary || '#666'} />
          <Text style={[styles.actionCount, { color: theme?.colors.textSecondary || '#666' }]}>{post.commentCount}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="share-outline" size={20} color={theme?.colors.textSecondary || '#666'} />
        </TouchableOpacity>
      </View>
      
      {post.comments.length > 0 && (
        <View style={[styles.commentsSection, { borderTopColor: theme?.colors.border || '#f0f0f0' }]}>
          {post.comments.slice(0, 3).map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Avatar
                imageUrl={comment.profiles?.profile_picture_url}
                name={comment.profiles?.name}
                size={24}
                style={styles.commentAvatar}
              />
              <View style={[styles.commentBubble, { backgroundColor: theme?.colors.surface || '#f0f0f0' }]}>
                <Text style={[styles.commentAuthor, { color: theme?.colors.text || '#333' }]}>{comment.profiles?.name}</Text>
                <Text style={[styles.commentContent, { color: theme?.colors.text || '#333' }]}>{comment.content}</Text>
              </View>
              <Text style={[styles.commentTime, { color: theme?.colors.textTertiary || '#999' }]}>{formatTimestamp(comment.created_at)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={() => <CreatePostInput user={user} onCreatePost={onCreatePost} groupId={group.id} />}
      contentContainerStyle={styles.feedContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

export default FeedTab;
