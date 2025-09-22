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

// Test authentication flow
export const testAuthFlow = async (email = 'test@scout.app', password = 'testpass123') => {
  try {
    console.log('🔄 Testing authentication flow...');
    
    // Test 1: Try to sign in with test credentials
    console.log('📧 Attempting login with:', email);
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (loginError) {
      console.log('❌ Login failed (expected if user doesn\'t exist):', loginError.message);
      
      // Test 2: Try to register the test user
      console.log('🔄 Attempting registration...');
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signupError) {
        console.error('❌ Registration failed:', signupError.message);
        return { success: false, error: signupError.message };
      }
      
      console.log('✅ Registration successful!');
      return { success: true, message: 'Registration successful', data: signupData };
    }
    
    console.log('✅ Login successful!');
    
    // Test 3: Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single();
    
    if (profileError) {
      console.log('⚠️ Profile not found:', profileError.message);
    } else {
      console.log('✅ Profile found:', profile.name || profile.email);
    }
    
    return { success: true, message: 'Login successful', data: loginData };
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
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
