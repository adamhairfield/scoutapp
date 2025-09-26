// SportsEngine API Configuration
// 
// To set up SportsEngine integration:
// 1. Register your app at https://developer.sportsengine.com/
// 2. Get your Client ID and Client Secret
// 3. Set up redirect URI in SportsEngine dashboard
// 4. Update the values below

export const SPORTSENGINE_CONFIG = {
  // Replace with your actual SportsEngine Client ID
  CLIENT_ID: process.env.EXPO_PUBLIC_SPORTSENGINE_CLIENT_ID || 'YOUR_SPORTSENGINE_CLIENT_ID',
  
  // Replace with your actual SportsEngine Client Secret
  // Note: In production, this should be handled server-side for security
  CLIENT_SECRET: process.env.EXPO_PUBLIC_SPORTSENGINE_CLIENT_SECRET || 'YOUR_SPORTSENGINE_CLIENT_SECRET',
  
  // SportsEngine API endpoints
  AUTH_BASE_URL: 'https://user.sportsengine.com',
  API_BASE_URL: 'https://api.sportsengine.com/graphql',
  
  // OAuth scopes (adjust based on your needs)
  SCOPES: ['read:organizations', 'read:teams', 'read:profiles', 'read:events'],
  
  // Token expiry time (in milliseconds) - SportsEngine tokens typically expire in 1 hour
  TOKEN_EXPIRY_TIME: 3600000, // 1 hour
};

// Validation function to check if configuration is complete
export const validateSportsEngineConfig = () => {
  const issues = [];
  
  if (!SPORTSENGINE_CONFIG.CLIENT_ID || SPORTSENGINE_CONFIG.CLIENT_ID === 'YOUR_SPORTSENGINE_CLIENT_ID') {
    issues.push('SportsEngine Client ID is not configured');
  }
  
  if (!SPORTSENGINE_CONFIG.CLIENT_SECRET || SPORTSENGINE_CONFIG.CLIENT_SECRET === 'YOUR_SPORTSENGINE_CLIENT_SECRET') {
    issues.push('SportsEngine Client Secret is not configured');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Helper function to get redirect URI for the current environment
export const getRedirectUri = () => {
  // This will be automatically generated based on your app's scheme
  // Make sure this matches what you've configured in SportsEngine dashboard
  return `${process.env.EXPO_PUBLIC_APP_SCHEME || 'scout'}://sportsengine-callback`;
};
