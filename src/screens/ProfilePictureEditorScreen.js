import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import AIProfileModal from '../components/AIProfileModal';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');

const ProfilePictureEditorScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshUserProfile } = useAuth();
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error choosing from library:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImage = async (imageUri) => {
    setUploading(true);
    
    try {
      // Delete old profile picture if exists
      if (user.profile_picture_url) {
        await profileService.deleteProfilePicture(user.id, user.profile_picture_url);
      }

      // Upload new profile picture
      const result = await profileService.uploadProfilePicture(user.id, imageUri);
      
      if (result.success) {
        await refreshUserProfile();
        Alert.alert('Success!', 'Profile picture updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleAIImageUpdate = async (imageUrl) => {
    try {
      await refreshUserProfile();
      Alert.alert('Success!', 'AI profile picture applied successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('Error updating AI image:', error);
      Alert.alert('Error', 'Failed to apply AI image');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your current profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              if (user.profile_picture_url) {
                await profileService.deleteProfilePicture(user.id, user.profile_picture_url);
                await refreshUserProfile();
                Alert.alert('Success!', 'Profile picture removed successfully!');
              }
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('Error', 'Failed to remove profile picture');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const options = [
    {
      id: 'camera',
      icon: 'camera',
      title: 'Take Photo',
      description: 'Use your camera to take a new photo',
      onPress: handleTakePhoto,
      color: '#667eea'
    },
    {
      id: 'library',
      icon: 'image',
      title: 'Choose from Library',
      description: 'Select an existing photo from your gallery',
      onPress: handleChooseFromLibrary,
      color: '#667eea'
    },
    {
      id: 'ai',
      icon: 'sparkles',
      title: 'Generate with AI',
      description: 'Create a professional AI-generated profile image',
      onPress: () => setAiModalVisible(true),
      color: '#FF6B6B',
      highlight: true
    }
  ];

  if (user.profile_picture_url) {
    options.push({
      id: 'remove',
      icon: 'trash',
      title: 'Remove Current Photo',
      description: 'Remove your current profile picture',
      onPress: handleRemovePhoto,
      color: '#FF3B30',
      destructive: true
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        navigation={navigation}
        title="Profile Picture"
        rightIcon="close"
        onRightPress={() => navigation.goBack()}
        backgroundColor={theme.colors.background}
        textColor={theme.colors.text}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Profile Picture */}
        <View style={styles.currentPhotoSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Current Photo</Text>
          <View style={[styles.currentPhotoContainer, { backgroundColor: theme.colors.surface }]}>
            {user.profile_picture_url ? (
              <Image
                source={{ uri: user.profile_picture_url }}
                style={styles.currentPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholderPhoto, { backgroundColor: theme.colors.border }]}>
                <Ionicons name="person" size={60} color={theme.colors.textTertiary} />
              </View>
            )}
          </View>
          <Text style={[styles.currentPhotoLabel, { color: theme.colors.textSecondary }]}>
            {user.name || 'Your Profile'}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Change Photo</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionItem,
                { backgroundColor: theme.colors.surface },
                option.highlight && styles.highlightOption,
                option.destructive && styles.destructiveOption
              ]}
              onPress={option.onPress}
              disabled={uploading}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                <Ionicons 
                  name={option.icon} 
                  size={24} 
                  color={option.color} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle, 
                  { color: option.destructive ? '#FF3B30' : theme.colors.text }
                ]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={theme.colors.textTertiary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <Text style={[styles.uploadingText, { color: theme.colors.text }]}>
              Uploading...
            </Text>
          </View>
        )}
      </ScrollView>

      <AIProfileModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        userId={user.id}
        onImageUpdate={handleAIImageUpdate}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  currentPhotoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  currentPhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentPhoto: {
    width: '100%',
    height: '100%',
  },
  placeholderPhoto: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPhotoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  highlightOption: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  destructiveOption: {
    // No special styling, just color changes
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
});

export default ProfilePictureEditorScreen;
