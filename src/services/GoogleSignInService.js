import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../config/supabase';

class GoogleSignInService {
  constructor() {
    this.configure();
  }

  configure() {
    GoogleSignin.configure({
      // Replace with your actual web client ID from Google Console
      webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      // iOS client ID
      iosClientId: '534069105587-msv0gqdi851dv4b2aimqtnvieqr2djtos.googleusercontent.com',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }

  async signIn() {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token
      const { idToken } = userInfo;
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Sign in to Supabase with Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        throw error;
      }

      // Create or update profile
      if (data.user) {
        await this.createOrUpdateProfile(data.user, userInfo.user);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  async createOrUpdateProfile(user, googleUser) {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: googleUser.name,
            email: user.email,
            profile_picture_url: googleUser.photo,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error creating profile:', error);
        }
      } else {
        // Update existing profile with Google info
        const { error } = await supabase
          .from('profiles')
          .update({
            name: googleUser.name,
            profile_picture_url: googleUser.photo,
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
        }
      }
    } catch (error) {
      console.error('Error managing profile:', error);
    }
  }

  async signOut() {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      return true;
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }

  async isSignedIn() {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }
}

export default new GoogleSignInService();
