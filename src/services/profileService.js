import { supabase } from '../config/supabase';

export const profileService = {
  // Upload profile picture
  async uploadProfilePicture(userId, imageUri) {
    try {
      // Create file name with timestamp to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fileName = `${userId}/profile_${timestamp}.${fileExtension}`;

      // Read the image file as ArrayBuffer using fetch
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to Uint8Array for Supabase
      const fileData = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, fileData, {
          contentType: `image/${fileExtension}`,
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update user profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      return {
        success: true,
        url: publicUrl,
        data: data
      };
    } catch (error) {
      console.error('Error updating profile picture:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user bio
  async updateUserBio(userId, bio) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ bio: bio })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error updating bio:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete old profile picture
  async deleteProfilePicture(userId, pictureUrl) {
    try {
      if (!pictureUrl) return { success: true };

      // Extract file path from URL
      const urlParts = pictureUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${userId}/${fileName}`;

      // Delete from storage
      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update profile picture URL in database
  async updateProfilePictureUrl(userId, pictureUrl) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: pictureUrl })
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating profile picture URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get user profile with picture
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update profile name
  async updateProfileName(userId, name) {
    try {
      console.log('Updating profile name:', { userId, name });
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ name: name })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Supabase error updating name:', error);
        throw error;
      }

      console.log('Profile name updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile name:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
