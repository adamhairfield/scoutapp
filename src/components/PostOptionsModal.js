import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import BottomDrawer from './BottomDrawer';
import DrawerOption from './DrawerOption';

const PostOptionsModal = ({ 
  visible, 
  onClose, 
  post, 
  currentUser, 
  onDeletePost, 
  onEditPost, 
  onReportPost 
}) => {
  const isPostAuthor = post?.author?.id === currentUser?.id;

  const handleDeletePost = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeletePost(post.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleEditPost = () => {
    onEditPost(post);
    onClose();
  };

  const handleReportPost = () => {
    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post for inappropriate content?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            onReportPost(post.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleCopyLink = () => {
    // TODO: Implement copy link functionality
    Alert.alert('Info', 'Copy link functionality coming soon!');
    onClose();
  };

  if (!post) return null;

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title="Post Options"
    >
      {/* Post Preview */}
      <View style={styles.postPreview}>
        <Text style={styles.postContent} numberOfLines={2}>
          {post.content}
        </Text>
        <Text style={styles.postAuthor}>
          by {post.author?.name} • {post.timestamp}
        </Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {isPostAuthor && (
          <>
            <DrawerOption
              icon="create-outline"
              iconColor="#667eea"
              title="Edit Post"
              onPress={handleEditPost}
            />

            <DrawerOption
              icon="trash-outline"
              title="Delete Post"
              onPress={handleDeletePost}
              destructive={true}
            />
          </>
        )}

        {!isPostAuthor && (
          <DrawerOption
            icon="flag-outline"
            iconColor="#FF9500"
            title="Report Post"
            titleColor="#FF9500"
            onPress={handleReportPost}
          />
        )}

        <DrawerOption
          icon="link-outline"
          title="Copy Link"
          onPress={handleCopyLink}
        />
      </View>
    </BottomDrawer>
  );
};

const styles = StyleSheet.create({
  postPreview: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  postAuthor: {
    fontSize: 14,
    color: '#666',
  },
  optionsContainer: {
    paddingTop: 8,
  },
});

export default PostOptionsModal;
