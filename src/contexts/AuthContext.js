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

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Check Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      } else if (session?.user) {
        // Get user profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
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
        // Check local storage as fallback
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
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

      // Get or create user profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              name: data.user.email.split('@')[0],
              role: role || 'player',
              created_at: new Date().toISOString(),
            }
          ])
          .select()
          .single();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          profile = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.email.split('@')[0],
            role: role || 'player',
          };
        } else {
          profile = newProfile;
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
