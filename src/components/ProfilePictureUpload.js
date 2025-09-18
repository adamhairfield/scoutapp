import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '../services/profileService';

const ProfilePictureUpload = ({ 
  userId, 
  currentImageUrl, 
  onImageUpdate, 
  style,
  size = 80,
  showEditIcon = false,
  isCoverPhoto = false
}) => {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to upload profile pictures.'
      );
      return false;
    }
    return true;
  };

  const showImagePicker = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Update Profile Picture',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openImageLibrary();
          }
        }
      );
    } else {
      // For Android, show alert
      Alert.alert(
        'Update Profile Picture',
        'Choose an option',
        [
          { text: 'Take Photo', onPress: openCamera },
          { text: 'Choose from Library', onPress: openImageLibrary },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isCoverPhoto ? [16, 9] : [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const openImageLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isCoverPhoto ? [16, 9] : [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri) => {
    setUploading(true);
    
    try {
      // Delete old profile picture if exists
      if (currentImageUrl) {
        await profileService.deleteProfilePicture(userId, currentImageUrl);
      }

      // Upload new profile picture
      const result = await profileService.uploadProfilePicture(userId, imageUri);
      
      if (result.success) {
        onImageUpdate(result.url);
        Alert.alert('Success', 'Profile picture updated successfully!');
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

  const handleLongPress = () => {
    const title = isCoverPhoto ? 'Update Cover Photo' : 'Update Profile Picture';
    const message = isCoverPhoto ? 'Would you like to change your cover photo?' : 'Would you like to change your profile picture?';
    
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change Picture', onPress: showImagePicker },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={[
        styles.imageContainer, 
        isCoverPhoto ? { width: size, height: 400 } : { width: size, height: size, borderRadius: size / 2 }
      ]}>
        {currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
            style={[
              styles.profileImage, 
              isCoverPhoto 
                ? { width: size, height: 400 } 
                : { width: size, height: size, borderRadius: size / 2 }
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={[
            styles.placeholderContainer, 
            isCoverPhoto 
              ? { width: size, height: 400 } 
              : { width: size, height: size, borderRadius: size / 2 }
          ]}>
            <Ionicons 
              name={isCoverPhoto ? "image" : "person"} 
              size={isCoverPhoto ? 60 : size * 0.5} 
              color="#667eea" 
            />
          </View>
        )}
        
        {uploading && (
          <View style={[
            styles.uploadingOverlay, 
            isCoverPhoto 
              ? { width: size, height: 400 } 
              : { width: size, height: size, borderRadius: size / 2 }
          ]}>
            <Ionicons name="cloud-upload" size={isCoverPhoto ? 40 : size * 0.3} color="#fff" />
          </View>
        )}
        
        {showEditIcon && (
          <View style={styles.editIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    backgroundColor: '#f0f0f0',
  },
  placeholderContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default ProfilePictureUpload;
