import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { photoUploadService } from '../services/PhotoUploadService';

const CreatePostInput = memo(({ user, onCreatePost, groupId }) => {
  const [postText, setPostText] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePost = async () => {
    if (!postText.trim() && selectedPhotos.length === 0 && !selectedVideo) {
      Alert.alert('Empty Post', 'Please add some text, photos, or a video to your post.');
      return;
    }

    setIsUploading(true);
    
    try {
      let photoUrls = [];
      let videoUrl = null;
      
      // Upload photos if any are selected
      if (selectedPhotos.length > 0) {
        const uploadResult = await photoUploadService.uploadMultiplePhotos(
          selectedPhotos,
          groupId,
          user.id
        );
        
        if (uploadResult.success) {
          photoUrls = uploadResult.data.uploaded.map(photo => photo.url);
        } else {
          Alert.alert('Upload Error', 'Failed to upload some photos. Please try again.');
          setIsUploading(false);
          return;
        }
      }

      // Upload video if selected
      if (selectedVideo) {
        const uploadResult = await photoUploadService.uploadVideo(
          selectedVideo,
          groupId,
          user.id
        );
        
        if (uploadResult.success) {
          videoUrl = uploadResult.data.url;
        } else {
          Alert.alert('Upload Error', 'Failed to upload video. Please try again.');
          setIsUploading(false);
          return;
        }
      }

      // Determine post type
      let postType = 'text';
      if (videoUrl) postType = 'video';
      else if (selectedPhotos.length > 0) postType = 'image';

      // Create post data
      const postData = {
        content: postText.trim(),
        post_type: postType,
        photo_urls: photoUrls.length > 1 ? photoUrls : null,
        photo_url: photoUrls.length === 1 ? photoUrls[0] : null,
        video_url: videoUrl,
      };

      await onCreatePost(postData);
      
      // Reset form
      setPostText('');
      setSelectedPhotos([]);
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPhotos = async () => {
    try {
      const photos = await photoUploadService.openImageLibrary({
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });

      if (photos && Array.isArray(photos)) {
        setSelectedPhotos(photos);
      } else if (photos) {
        setSelectedPhotos([photos]);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await photoUploadService.openCamera({
        quality: 0.8,
      });

      if (photo) {
        setSelectedPhotos(prev => [...prev, photo]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemovePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectVideo = async () => {
    try {
      const video = await photoUploadService.openVideoLibrary({
        quality: 0.8,
        durationLimit: 60, // 60 seconds max
      });

      if (video) {
        setSelectedVideo(video);
        // Clear photos when video is selected (can't have both)
        setSelectedPhotos([]);
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const handleRecordVideo = async () => {
    try {
      const video = await photoUploadService.openVideoCamera({
        quality: 0.8,
        durationLimit: 60, // 60 seconds max
      });

      if (video) {
        setSelectedVideo(video);
        // Clear photos when video is selected (can't have both)
        setSelectedPhotos([]);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handleSelectPhotos },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showVideoOptions = () => {
    Alert.alert(
      'Add Video',
      'Choose how you want to add a video',
      [
        { text: 'Record Video', onPress: handleRecordVideo },
        { text: 'Video Library', onPress: handleSelectVideo },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.createPostContainer}>
      <View style={styles.createPostHeader}>
        <Avatar
          imageUrl={user.profile_picture_url}
          name={user.name}
          size={40}
        />
        <TextInput
          style={styles.postInput}
          placeholder="Say something..."
          placeholderTextColor="#999"
          value={postText}
          onChangeText={setPostText}
          multiline
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          autoCorrect={true}
          spellCheck={true}
        />
      </View>

      {/* Photo Preview Section */}
      {selectedPhotos.length > 0 && (
        <View style={styles.photoPreviewContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.photoPreviewScroll}
          >
            {selectedPhotos.map((photo, index) => (
              <View key={index} style={styles.photoPreviewItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Video Preview Section */}
      {selectedVideo && (
        <View style={styles.videoPreviewContainer}>
          <View style={styles.videoPreviewItem}>
            <View style={styles.videoThumbnail}>
              <Ionicons name="play-circle" size={40} color="#fff" />
              <Text style={styles.videoText}>Video Selected</Text>
              <Text style={styles.videoDuration}>
                {selectedVideo.duration ? `${Math.round(selectedVideo.duration)}s` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={handleRemoveVideo}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.createPostActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={showPhotoOptions}
          disabled={isUploading}
        >
          <Ionicons name="camera" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={showVideoOptions}
          disabled={isUploading}
        >
          <Ionicons name="videocam" size={20} color="#2196F3" />
          <Text style={styles.actionText}>Video</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="link" size={20} color="#FF9800" />
          <Text style={styles.actionText}>Link</Text>
        </TouchableOpacity>
        
        {(postText.trim() || selectedPhotos.length > 0 || selectedVideo) && (
          <TouchableOpacity 
            style={[styles.postButton, isUploading && styles.postButtonDisabled]} 
            onPress={handlePost}
            disabled={isUploading}
          >
            {isUploading ? (
              <Text style={styles.postButtonText}>Posting...</Text>
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
    gap: 12,
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
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  photoPreviewContainer: {
    marginBottom: 15,
  },
  photoPreviewScroll: {
    maxHeight: 100,
  },
  photoPreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  videoPreviewContainer: {
    marginBottom: 15,
  },
  videoPreviewItem: {
    position: 'relative',
    width: 120,
  },
  videoThumbnail: {
    width: 120,
    height: 80,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  videoDuration: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  removeVideoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default CreatePostInput;
