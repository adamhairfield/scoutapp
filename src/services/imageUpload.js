import { supabase } from '../config/supabase';

export const imageUploadService = {
  /**
   * Upload an image to Supabase Storage
   * @param {string} uri - Local image URI
   * @param {string} bucket - Storage bucket name
   * @param {string} path - File path in storage
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadImage(uri, bucket, path) {
    try {
      // Create a unique filename
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${path}.${fileExt}`;
      
      // Read the file as ArrayBuffer for React Native
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Upload to Supabase Storage using ArrayBuffer
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true, // Replace if exists
          contentType: `image/${fileExt}`,
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Image upload failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Upload group cover photo
   * @param {string} uri - Local image URI
   * @param {string} groupId - Group ID for unique naming
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadGroupCover(uri, groupId) {
    const path = `covers/${groupId}-${Date.now()}`;
    return this.uploadImage(uri, 'group-covers', path);
  },

  /**
   * Upload profile picture
   * @param {string} userId - User ID for unique naming
   * @param {string} uri - Local image URI
   * @param {string} filename - Optional custom filename
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadProfilePicture(userId, uri, filename = null) {
    const path = filename || `profile_${Date.now()}`;
    return this.uploadImage(uri, 'profile-pictures', `${userId}/${path}`);
  },

  /**
   * Delete an image from storage
   * @param {string} bucket - Storage bucket name
   * @param {string} path - File path in storage
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteImage(bucket, path) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Image delete failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Extract file path from Supabase Storage URL
   * @param {string} url - Full Supabase Storage URL
   * @returns {string|null} - File path or null if invalid URL
   */
  extractPathFromUrl(url) {
    try {
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const pathWithBucket = urlParts[1];
        const pathParts = pathWithBucket.split('/');
        if (pathParts.length > 1) {
          return pathParts.slice(1).join('/'); // Remove bucket name
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  },

  /**
   * Download image from external URL and upload to Supabase Storage
   * @param {string} externalUrl - External image URL (e.g., from AI service)
   * @param {string} bucket - Storage bucket name
   * @param {string} path - File path in storage
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async downloadAndUploadImage(externalUrl, bucket, path) {
    try {
      console.log('📥 Downloading image from external URL:', externalUrl);
      
      // Download the image from external URL
      const response = await fetch(externalUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Determine file extension from URL or default to jpg
      let fileExt = 'jpg';
      const urlExt = externalUrl.split('.').pop()?.toLowerCase();
      if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt)) {
        fileExt = urlExt;
      }
      
      const fileName = `${path}.${fileExt}`;
      
      console.log('📤 Uploading to Supabase Storage:', bucket, fileName);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('✅ Successfully uploaded to Supabase:', publicUrl);
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('❌ Download and upload failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Download AI-generated cover photo and upload to group-covers bucket
   * @param {string} aiImageUrl - AI-generated image URL
   * @param {string} groupId - Group ID for unique naming
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadAIGeneratedCover(aiImageUrl, groupId) {
    const path = `covers/ai-${groupId}-${Date.now()}`;
    return this.downloadAndUploadImage(aiImageUrl, 'group-covers', path);
  }
};
