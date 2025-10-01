import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { aiProfileService } from '../services/aiProfileService';
import { imageUploadService } from '../services/imageUpload';
import { profileService } from '../services/profileService';
import ImageCompositor from './ImageCompositor';

const { width } = Dimensions.get('window');

const AIProfileModal = ({ visible, onClose, userId, onImageUpdate }) => {
  const { theme } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState('athletic');
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState('upload'); // 'upload', 'style', 'generating', 'preview'
  const [headshotUri, setHeadshotUri] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [compositedImageUri, setCompositedImageUri] = useState(null);

  const styleOptions = aiProfileService.getStyleOptions();

  const handleUploadHeadshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a headshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setHeadshotUri(result.assets[0].uri);
        setStep('style');
      }
    } catch (error) {
      console.error('Error selecting headshot:', error);
      Alert.alert('Error', 'Failed to select headshot. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setHeadshotUri(result.assets[0].uri);
        setStep('style');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleGenerateProfile = async () => {
    if (!headshotUri) return;

    setGenerating(true);
    setStep('generating');

    try {
      // First upload the headshot to get a URL
      console.log('📤 Uploading headshot...');
      const uploadResult = await imageUploadService.uploadProfilePicture(
        userId,
        headshotUri,
        `${userId}-headshot-${Date.now()}`
      );

      if (!uploadResult.success) {
        throw new Error('Failed to upload headshot');
      }

      console.log('✅ Headshot uploaded, starting AI generation...');
      
      // Generate AI profile with background removal and new background
      const result = await aiProfileService.generateAIProfile(uploadResult.url, selectedStyle);

      if (result.success) {
        setGeneratedResult(result);
        setStep('preview');
      } else {
        Alert.alert('Error', result.error || 'Failed to generate AI profile. Please try again.');
        setStep('style');
      }
    } catch (error) {
      console.error('Error generating AI profile:', error);
      Alert.alert('Error', 'Failed to generate AI profile. Please try again.');
      setStep('style');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseGeneratedImage = async () => {
    const imageToUse = compositedImageUri || generatedResult?.cutoutImageUrl;
    if (!imageToUse) return;

    try {
      // Upload the image to the profile service
      console.log('📤 Uploading AI-generated profile image...');
      
      const uploadResult = await imageUploadService.uploadProfilePicture(
        userId,
        imageToUse,
        `ai-profile-${Date.now()}`
      );

      if (uploadResult.success) {
        // Update the user's profile picture in the database
        const profileUpdateResult = await profileService.updateProfilePictureUrl(userId, uploadResult.url);
        
        if (profileUpdateResult.success) {
          onImageUpdate(uploadResult.url);
          const message = compositedImageUri 
            ? `Enhanced AI profile image applied successfully! ${generatedResult?.upscaledUrl ? '(Upscaled for better quality)' : ''}`
            : 'Profile cutout applied successfully!';
          Alert.alert('Success!', message);
          handleClose();
        } else {
          Alert.alert('Error', 'Failed to update profile. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Error applying generated image:', error);
      Alert.alert('Error', 'Failed to apply generated image. Please try again.');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setHeadshotUri(null);
    setGeneratedResult(null);
    setCompositedImageUri(null);
    setSelectedStyle('athletic');
    onClose();
  };

  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Upload Your Headshot</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Choose a clear photo of yourself. We'll remove the background and add a professional AI-generated background.
      </Text>
      
      <View style={styles.uploadOptions}>
        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleTakePhoto}
        >
          <Ionicons name="camera" size={32} color="#667eea" />
          <Text style={[styles.uploadButtonText, { color: theme.colors.text }]}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.uploadButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleUploadHeadshot}
        >
          <Ionicons name="image" size={32} color="#667eea" />
          <Text style={[styles.uploadButtonText, { color: theme.colors.text }]}>Choose from Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStyleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Choose Your Style</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Select a background style for your AI-generated profile image.
      </Text>

      {headshotUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: headshotUri }} style={styles.headshotPreview} />
          <Text style={[styles.previewLabel, { color: theme.colors.textSecondary }]}>Your Headshot</Text>
        </View>
      )}
      
      <ScrollView style={styles.styleOptions} showsVerticalScrollIndicator={false}>
        {styleOptions.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.styleOption,
              { backgroundColor: theme.colors.surface },
              selectedStyle === style.id && styles.selectedStyleOption
            ]}
            onPress={() => setSelectedStyle(style.id)}
          >
            <View style={styles.styleInfo}>
              <Text style={[styles.styleName, { color: theme.colors.text }]}>{style.name}</Text>
              <Text style={[styles.styleDescription, { color: theme.colors.textSecondary }]}>
                {style.description}
              </Text>
            </View>
            {selectedStyle === style.id && (
              <Ionicons name="checkmark-circle" size={24} color="#667eea" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.generateButton, { backgroundColor: '#667eea' }]}
        onPress={handleGenerateProfile}
        disabled={generating}
      >
        <Text style={styles.generateButtonText}>Generate AI Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGeneratingStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Creating Your AI Profile</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        We're removing the background from your headshot and generating a professional AI background. This may take a moment...
      </Text>
      
      <View style={styles.processingSteps}>
        <View style={styles.processingStep}>
          <Ionicons name="cut" size={20} color="#667eea" />
          <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
            Removing background...
          </Text>
        </View>
        <View style={styles.processingStep}>
          <Ionicons name="brush" size={20} color="#667eea" />
          <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
            Generating AI background...
          </Text>
        </View>
        <View style={styles.processingStep}>
          <Ionicons name="layers" size={20} color="#667eea" />
          <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
            Compositing final image...
          </Text>
        </View>
      </View>
    </View>
  );

  const handleCompositeReady = (compositeUri) => {
    console.log('✅ Client-side composite ready:', compositeUri);
    setCompositedImageUri(compositeUri);
  };

  const renderPreviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Your AI Profile</Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Here's your enhanced headshot with the {selectedStyle} background. {generatedResult?.upscaledUrl && "Your image has been upscaled for better quality."}
      </Text>

      {generatedResult?.needsCompositing && (
        <View style={styles.resultContainer}>
          <ImageCompositor
            backgroundUrl={generatedResult.backgroundUrl}
            cutoutUrl={generatedResult.cutoutImageUrl}
            onCompositeReady={handleCompositeReady}
            style={styles.compositorContainer}
          />
          {!compositedImageUri && (
            <View style={styles.compositingOverlay}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={[styles.compositingText, { color: theme.colors.textSecondary }]}>
                Creating your composite...
              </Text>
            </View>
          )}
          {generatedResult?.upscaledUrl && (
            <View style={styles.enhancedBadge}>
              <Text style={styles.enhancedText}>Enhanced Quality</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.previewActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.regenerateButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => setStep('style')}
        >
          <Ionicons name="refresh" size={20} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Try Different Style</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.useButton, { backgroundColor: '#667eea' }]}
          onPress={handleUseGeneratedImage}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>Use This Image</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'style':
        return renderStyleStep();
      case 'generating':
        return renderGeneratingStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return renderUploadStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>AI Profile Generator</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCurrentStep()}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  uploadButton: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headshotPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
  },
  styleOptions: {
    maxHeight: 300,
    marginBottom: 20,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStyleOption: {
    borderColor: '#667eea',
  },
  styleInfo: {
    flex: 1,
  },
  styleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 14,
  },
  generateButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginBottom: 20,
  },
  processingSteps: {
    marginTop: 30,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  processingText: {
    marginLeft: 12,
    fontSize: 16,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultImage: {
    width: width - 80,
    height: width - 80,
    borderRadius: 12,
  },
  fallbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  compositorContainer: {
    marginBottom: 20,
  },
  compositingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  compositingText: {
    marginTop: 8,
    fontSize: 14,
  },
  enhancedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  enhancedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: '#667eea',
  },
  useButton: {
    // backgroundColor set inline
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AIProfileModal;
