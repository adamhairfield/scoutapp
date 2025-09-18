import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (!user?.id) {
      console.log('No user ID available for refresh');
      return;
    }
    
    try {
      console.log('Refreshing user profile for ID:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching updated profile:', error);
        return;
      }

      if (profile) {
        console.log('Updated profile data:', profile);
        
        const updatedUser = {
          ...user,
          ...profile
        };
        
        console.log('Setting updated user:', updatedUser);
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('User profile refreshed successfully');
      } else {
        console.log('No profile data returned');
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  useEffect(() => {
    checkAuthState();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session) {
          // User signed out or session expired
          await AsyncStorage.removeItem('user');
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // User signed in - get fresh profile data
          let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          // If profile doesn't exist, try to create it
          if (profileError || !profile) {
            try {
              await supabase.rpc('create_missing_profile', {
                user_id: session.user.id,
                user_email: session.user.email,
                user_name: session.user.email.split('@')[0],
                user_role: 'player'
              });

              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              profile = newProfile;
            } catch (error) {
              console.error('Error creating profile on sign in:', error);
            }
          }
          
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.email.split('@')[0],
            role: profile?.role || 'player',
            ...profile
          };
          
          setUser(userData);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Check Supabase session first
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // Clear any cached data if session check fails
        await AsyncStorage.removeItem('user');
        setUser(null);
        return;
      }
      
      if (session?.user) {
        // Valid session exists - get fresh profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError || !profile) {
          console.log('Profile not found during auth check, attempting to create one for user:', session.user.id);
          
          try {
            // Try to create missing profile
            await supabase.rpc('create_missing_profile', {
              user_id: session.user.id,
              user_email: session.user.email,
              user_name: session.user.email.split('@')[0],
              user_role: 'player'
            });

            // Try to fetch the profile again
            const { data: newProfile, error: newProfileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (newProfileError || !newProfile) {
              console.error('Could not create/fetch profile during auth check:', newProfileError);
              await AsyncStorage.removeItem('user');
              setUser(null);
              return;
            }

            profile = newProfile;
          } catch (error) {
            console.error('Error creating missing profile during auth check:', error);
            await AsyncStorage.removeItem('user');
            setUser(null);
            return;
          }
        }
        
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: profile?.name || session.user.email.split('@')[0],
          role: profile?.role || 'player',
          ...profile
        };
        
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } else {
        // No valid session - clear any cached data
        console.log('No valid session found, clearing cached data');
        await AsyncStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // On any error, clear auth state to be safe
      await AsyncStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, role) => {
    try {
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get user profile (should already exist from registration)
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Profile doesn't exist - try to create it for existing users
        console.log('Profile not found, attempting to create one for user:', data.user.id);
        
        try {
          // Call the create_missing_profile function
          const { data: createResult, error: createError } = await supabase
            .rpc('create_missing_profile', {
              user_id: data.user.id,
              user_email: data.user.email,
              user_name: data.user.email.split('@')[0],
              user_role: 'player'
            });

          if (createError) {
            console.error('Failed to create profile:', createError);
            return { 
              success: false, 
              error: 'Could not create user profile. Please try again or contact support.' 
            };
          }

          // Try to fetch the profile again
          const { data: newProfile, error: newProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (newProfileError || !newProfile) {
            console.error('Still could not fetch profile after creation:', newProfileError);
            return { 
              success: false, 
              error: 'Profile creation failed. Please contact support.' 
            };
          }

          profile = newProfile;
        } catch (error) {
          console.error('Error creating missing profile:', error);
          return { 
            success: false, 
            error: 'Could not create user profile. Please try again.' 
          };
        }
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: profile.name || data.user.email.split('@')[0],
        role: profile.role || 'player',
        ...profile
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, role, additionalData = {}) => {
    try {
      // Register with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role || 'player',
            name: additionalData.name || email.split('@')[0],
            ...additionalData
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if profile already exists (created by trigger)
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        // Create user profile if it doesn't exist
        const profileData = {
          id: data.user.id,
          email: data.user.email,
          name: additionalData.name || data.user.email.split('@')[0],
          role: role || 'player',
          created_at: new Date().toISOString(),
          ...additionalData,
        };

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          existingProfile = profileData; // Use the data we tried to insert
        } else {
          existingProfile = newProfile;
        }
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        ...existingProfile
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
