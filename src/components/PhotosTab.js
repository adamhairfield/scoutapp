import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const PhotosTab = ({ posts, onOpenPhotoViewer, onOpenVideoViewer, styles }) => {
  // Extract photos and videos from posts for the Photos tab
  const getGroupPhotos = () => {
    const media = [];
    posts.forEach(post => {
      if (post.photo_urls && post.photo_urls.length > 0) {
        // Only show the first photo, but include count info
        media.push({
          id: `${post.id}-first`,
          url: post.photo_urls[0],
          postId: post.id,
          postContent: post.content,
          author: post.author.name,
          timestamp: post.timestamp,
          allPhotos: post.photo_urls,
          photoIndex: 0,
          totalCount: post.photo_urls.length,
          isMultiple: post.photo_urls.length > 1,
          type: 'photo'
        });
      } else if (post.photo_url) {
        media.push({
          id: `${post.id}-single`,
          url: post.photo_url,
          postId: post.id,
          postContent: post.content,
          author: post.author.name,
          timestamp: post.timestamp,
          allPhotos: [post.photo_url],
          photoIndex: 0,
          totalCount: 1,
          isMultiple: false,
          type: 'photo'
        });
      } else if (post.video_url) {
        // Add videos to the media grid
        media.push({
          id: `${post.id}-video`,
          url: post.video_url,
          postId: post.id,
          postContent: post.content,
          author: post.author.name,
          timestamp: post.timestamp,
          videoDuration: post.video_duration,
          videoWidth: post.video_width,
          videoHeight: post.video_height,
          type: 'video'
        });
      }
    });
    return media;
  };

  const renderPhotoItem = ({ item: media }) => (
    <TouchableOpacity
      style={styles.photoGridItem}
      onPress={() => {
        if (media.type === 'video') {
          onOpenVideoViewer(media);
        } else {
          onOpenPhotoViewer(media.allPhotos, media.photoIndex);
        }
      }}
    >
      {media.type === 'video' ? (
        <Video
          source={{ uri: media.url }}
          style={styles.photoGridImage}
          resizeMode="cover"
          shouldPlay={false}
          isLooping={false}
          useNativeControls={false}
        />
      ) : (
        <Image
          source={{ uri: media.url }}
          style={styles.photoGridImage}
          resizeMode="cover"
        />
      )}
      
      {/* Video play icon overlay */}
      {media.type === 'video' && (
        <View style={styles.videoPlayOverlay}>
          <Ionicons name="play-circle" size={32} color="#fff" />
          {media.videoDuration && (
            <Text style={styles.videoDurationOverlay}>
              {Math.floor(media.videoDuration / 60)}:{(media.videoDuration % 60).toString().padStart(2, '0')}
            </Text>
          )}
        </View>
      )}
      
      {/* Photo count overlay for multiple photos */}
      {media.type === 'photo' && media.isMultiple && (
        <View style={styles.photoCountOverlay}>
          <Ionicons name="copy-outline" size={16} color="#fff" />
          <Text style={styles.photoCountText}>{media.totalCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
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
          <Text style={styles.emptyPhotosText}>No media yet</Text>
          <Text style={styles.emptyPhotosSubtext}>Photos and videos from posts will appear here</Text>
        </View>
      )}
    />
  );
};

export default PhotosTab;
