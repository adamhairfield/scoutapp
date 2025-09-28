import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const VideoViewer = ({ visible, onClose, videoUrl, postContent, author, timestamp }) => {
  const [status, setStatus] = useState({});
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);

  const formatDuration = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPosition = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleVideoPress = () => {
    setShowControls(!showControls);
    // Auto-hide controls after 3 seconds
    if (!showControls) {
      setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleClose = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { opacity: showControls ? 1 : 0 }]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.authorName}>{author}</Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
          </View>

          {/* Video */}
          <TouchableOpacity 
            style={styles.videoContainer} 
            onPress={handleVideoPress}
            activeOpacity={1}
          >
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode="contain"
              shouldPlay={false}
              isLooping={false}
              onPlaybackStatusUpdate={setStatus}
              useNativeControls={false}
            />

            {/* Custom Controls Overlay */}
            {showControls && (
              <View style={styles.controlsOverlay}>
                {/* Play/Pause Button */}
                <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                  <Ionicons 
                    name={status.isPlaying ? "pause" : "play"} 
                    size={60} 
                    color="#fff" 
                  />
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>
                    {formatPosition(status.positionMillis)}
                  </Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: status.durationMillis 
                            ? `${(status.positionMillis / status.durationMillis) * 100}%` 
                            : '0%' 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.timeText}>
                    {formatDuration(status.durationMillis)}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Post Content */}
          {postContent && (
            <View style={[styles.footer, { opacity: showControls ? 1 : 0 }]}>
              <Text style={styles.postContent}>{postContent}</Text>
            </View>
          )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 60, // Push down from status bar
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  authorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    padding: 20,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  postContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default VideoViewer;
