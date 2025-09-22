import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  PanResponder,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PhotoViewer = ({ 
  visible, 
  onClose, 
  photos = [], // Array of photo URLs
  initialIndex = 0 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef(null);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Pan responder for pinch-to-zoom and pan gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Don't interfere with scroll initially
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only handle if it's a vertical gesture (for pull-to-close) or if zoomed
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
        translateY.setOffset(translateY._value);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: translateX, dy: translateY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        translateY.flattenOffset();

        // If dragged down significantly, close the viewer
        if (gestureState.dy > 100 && Math.abs(gestureState.vx) < 0.5) {
          onClose();
          return;
        }

        // Spring back to center if not closing
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
          }),
        ]).start();
      },
    })
  ).current;

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / screenWidth);
    setCurrentIndex(index);
  };

  const handleScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / screenWidth);
    
    // Snap to the nearest page
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
    
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * screenWidth,
        animated: true,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * screenWidth,
        animated: true,
      });
    }
  };

  const renderPhoto = (photoUrl, index) => (
    <View key={index} style={styles.photoContainer}>
      <TouchableOpacity 
        style={styles.imageWrapper}
        activeOpacity={1}
        onPress={() => {}} // Prevent any touch interference
      >
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  if (!visible || photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {photos.length > 1 && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {currentIndex + 1} of {photos.length}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Photo Viewer */}
        <View style={styles.photoViewerContainer}>
          {photos.length === 1 ? (
            // Single photo
            renderPhoto(photos[0], 0)
          ) : (
            // Multiple photos with ScrollView
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.scrollView}
              contentContainerStyle={{ flexDirection: 'row' }}
              bounces={false}
              alwaysBounceHorizontal={false}
              decelerationRate="fast"
            >
              {photos.map((photoUrl, index) => renderPhoto(photoUrl, index))}
            </ScrollView>
          )}

          {/* Navigation arrows for multiple photos */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={goToPrevious}
                >
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
              )}

              {currentIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={goToNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bottom indicators for multiple photos */}
        {photos.length > 1 && (
          <View style={styles.indicators}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60, // Account for status bar
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  closeButton: {
    padding: 8,
  },
  counter: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
  },
  photoViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  indicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 24,
  },
});

export default PhotoViewer;
