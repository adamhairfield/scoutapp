import React, { useEffect, useState, useRef } from 'react';
import { View, Image, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';

const { width } = Dimensions.get('window');

const ImageCompositor = ({ 
  backgroundUrl, 
  cutoutUrl, 
  onCompositeReady,
  style = {}
}) => {
  const [imagesLoaded, setImagesLoaded] = useState({ background: false, cutout: false });
  const [compositeDimensions, setCompositeDimensions] = useState({ width: 300, height: 300 });
  const viewShotRef = useRef();

  // Debug logging
  console.log('🎨 ImageCompositor URLs:', { backgroundUrl, cutoutUrl });

  useEffect(() => {
    if (imagesLoaded.background && imagesLoaded.cutout) {
      // Capture the composite image after both images load
      setTimeout(async () => {
        try {
          const compositeUri = await viewShotRef.current.capture();
          console.log('✅ Composite image captured:', compositeUri);
          if (onCompositeReady) {
            onCompositeReady(compositeUri); // Return the actual composite image
          }
        } catch (error) {
          console.error('❌ Error capturing composite:', error);
          // Fallback to cutout if capture fails
          if (onCompositeReady) {
            onCompositeReady(cutoutUrl);
          }
        }
      }, 1500); // Give images time to fully render
    }
  }, [imagesLoaded, cutoutUrl, onCompositeReady]);

  const handleBackgroundLoad = () => {
    // Calculate dimensions for display
    const maxSize = width - 80;
    setCompositeDimensions({ width: maxSize, height: maxSize });
    setImagesLoaded(prev => ({ ...prev, background: true }));
  };

  const handleCutoutLoad = () => {
    setImagesLoaded(prev => ({ ...prev, cutout: true }));
  };

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <ViewShot 
        ref={viewShotRef}
        options={{ format: "jpg", quality: 0.9 }}
        style={{
          width: compositeDimensions.width,
          height: compositeDimensions.height,
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden'
        }}
      >
        {/* Background Image */}
        {backgroundUrl && (
          <Image
            source={{ uri: backgroundUrl }}
            style={{
              width: compositeDimensions.width,
              height: compositeDimensions.height,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1
            }}
            onLoad={handleBackgroundLoad}
            onError={(error) => console.error('Background image load error:', error)}
            resizeMode="cover"
          />
        )}
        
        {/* Cutout Image Overlay - This preserves your actual face */}
        {cutoutUrl && (
          <Image
            source={{ uri: cutoutUrl }}
            style={{
              width: compositeDimensions.width,
              height: compositeDimensions.height,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2
            }}
            onLoad={handleCutoutLoad}
            onError={(error) => console.error('Cutout image load error:', error)}
            resizeMode="contain"
          />
        )}
      </ViewShot>
    </View>
  );
};

export default ImageCompositor;
