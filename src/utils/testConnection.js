import { supabase } from '../config/supabase';

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Supabase connection successful!');
    
    // Test 2: Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    console.log('👤 Current session:', session ? 'Logged in' : 'Not logged in');
    
    return { success: true, message: 'Connection successful' };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Test user registration
export const testUserRegistration = async (email = 'test@scout.app', password = 'testpass123') => {
  try {
    console.log('🔄 Testing user registration...');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ User registration successful!', data.user?.email);
    return { success: true, user: data.user };
    
  } catch (error) {
    console.error('❌ Registration test failed:', error.message);
    return { success: false, error: error.message };
  }
};
