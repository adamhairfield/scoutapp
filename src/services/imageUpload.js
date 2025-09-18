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
  }
};
