import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

class PhotoUploadService {
  constructor() {
    this.bucketName = 'group-photos';
  }

  /**
   * Request camera and media library permissions
   */
  async requestPermissions() {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.'
        );
        return false;
      }

      // Request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryPermission.status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please enable photo library access in your device settings to select photos.'
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Show image picker options (camera or library)
   */
  async showImagePicker(options = {}) {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return null;

    return new Promise((resolve) => {
      Alert.alert(
        'Select Photo',
        'Choose how you want to add a photo',
        [
          {
            text: 'Camera',
            onPress: () => this.openCamera(options).then(resolve),
          },
          {
            text: 'Photo Library',
            onPress: () => this.openImageLibrary(options).then(resolve),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
        ]
      );
    });
  }

  /**
   * Open camera to take a photo
   */
  async openCamera(options = {}) {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images', // Use string instead of enum
        allowsEditing: true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
      return null;
    }
  }

  /**
   * Open image library to select photos
   */
  async openImageLibrary(options = {}) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Use string instead of enum
        allowsEditing: !options.allowsMultipleSelection,
        allowsMultipleSelection: options.allowsMultipleSelection || false,
        selectionLimit: options.selectionLimit || 1,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return options.allowsMultipleSelection ? result.assets : result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library');
      return null;
    }
  }

  /**
   * Upload a single photo to Supabase storage
   */
  async uploadPhoto(imageAsset, groupId, userId) {
    try {
      if (!imageAsset || !imageAsset.uri) {
        throw new Error('Invalid image asset');
      }

      // Create a unique filename
      const fileExtension = imageAsset.uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const filePath = `${groupId}/${fileName}`;

      // Read file as ArrayBuffer (React Native compatible)
      const response = await fetch(imageAsset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExtension}`,
          metadata: {
            uploadedBy: userId,
            groupId: groupId,
            originalName: imageAsset.fileName || fileName,
          },
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        data: {
          path: filePath,
          url: urlData.publicUrl,
          fileName: fileName,
        },
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload multiple photos to Supabase storage
   */
  async uploadMultiplePhotos(imageAssets, groupId, userId) {
    try {
      if (!Array.isArray(imageAssets) || imageAssets.length === 0) {
        throw new Error('Invalid image assets array');
      }

      const uploadPromises = imageAssets.map(asset => 
        this.uploadPhoto(asset, groupId, userId)
      );

      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(result => result.success);
      const failed = results.filter(result => !result.success);

      return {
        success: failed.length === 0,
        data: {
          uploaded: successful.map(result => result.data),
          failed: failed.length,
          total: results.length,
        },
        error: failed.length > 0 ? `${failed.length} uploads failed` : null,
      };
    } catch (error) {
      console.error('Error uploading multiple photos:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a photo from Supabase storage
   */
  async deletePhoto(filePath) {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting photo:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get signed URL for private photo access
   */
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          signedUrl: data.signedUrl,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      };
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Open video library to select a video
   */
  async openVideoLibrary(options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: options.quality || 0.8,
        videoMaxDuration: options.durationLimit || 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        return {
          uri: video.uri,
          type: video.type,
          duration: video.duration,
          width: video.width,
          height: video.height,
        };
      }

      return null;
    } catch (error) {
      console.error('Error selecting video:', error);
      throw error;
    }
  }

  /**
   * Open camera to record a video
   */
  async openVideoCamera(options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: options.quality || 0.8,
        videoMaxDuration: options.durationLimit || 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        return {
          uri: video.uri,
          type: video.type,
          duration: video.duration,
          width: video.width,
          height: video.height,
        };
      }

      return null;
    } catch (error) {
      console.error('Error recording video:', error);
      throw error;
    }
  }

  /**
   * Upload a video to Supabase Storage
   */
  async uploadVideo(video, groupId, userId) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${groupId}/${userId}/video_${timestamp}.mp4`;

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: video.uri,
        type: 'video/mp4',
        name: fileName,
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, formData, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        success: true,
        data: {
          url: urlData.publicUrl,
          path: fileName,
          duration: video.duration,
          width: video.width,
          height: video.height,
        },
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create the storage bucket if it doesn't exist
   */
  async createBucket() {
    try {
      const { data, error } = await supabase.storage.createBucket(this.bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB for videos
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/quicktime', 'video/x-msvideo'
        ],
      });

      if (error) {
        // Bucket might already exist
        if (error.message.includes('already exists')) {
          return { success: true, message: 'Bucket already exists' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating bucket:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const photoUploadService = new PhotoUploadService();
export default photoUploadService;
