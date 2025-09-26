import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

class SportsEngineScrapingService {
  constructor() {
    // Get backend URL from app configuration
    const isDevelopment = __DEV__;
    const backendConfig = Constants.expoConfig?.extra?.sportsEngineBackend;
    
    this.backendUrl = isDevelopment 
      ? (backendConfig?.development || 'http://localhost:3001')
      : (backendConfig?.production || process.env.EXPO_PUBLIC_BACKEND_URL);
    this.loginUrl = 'https://user.sportngin.com/users/sign_in';
    this.dashboardUrl = 'https://www.sportsengine.com/hq';
  }

  /**
   * Authenticate user with SportsEngine credentials
   * This sends credentials to your backend service which handles the actual scraping
   */
  async authenticateWithCredentials(email, password) {
    try {
      console.log('Authenticating with SportsEngine...');
      
      const response = await fetch(`${this.backendUrl}/api/sportsengine/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Store session info securely - handle both old and new response formats
        const sessionData = result.sessionData || { 
          token: result.token, 
          taskId: result.taskId, 
          taskUrl: result.taskUrl 
        };
        
        if (sessionData && (sessionData.token || sessionData.cookies)) {
          await this.storeSessionData(sessionData);
          return { success: true, sessionData: sessionData };
        } else {
          console.warn('No valid session data received:', result);
          throw new Error('No valid session data received from server');
        }
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('SportsEngine authentication error:', error);
      throw error;
    }
  }

  /**
   * Store session data securely
   */
  async storeSessionData(sessionData) {
    try {
      if (!sessionData) {
        console.warn('Attempted to store null/undefined session data');
        return;
      }
      
      const dataToStore = JSON.stringify(sessionData);
      if (dataToStore === 'null' || dataToStore === 'undefined') {
        console.warn('Session data serialized to null/undefined, skipping storage');
        return;
      }
      
      await AsyncStorage.setItem('sportsengine_session', dataToStore);
      await AsyncStorage.setItem('sportsengine_session_timestamp', Date.now().toString());
      console.log('Session data stored successfully');
    } catch (error) {
      console.error('Error storing session data:', error);
      throw error;
    }
  }

  /**
   * Get stored session data
   */
  async getStoredSession() {
    try {
      const sessionJson = await AsyncStorage.getItem('sportsengine_session');
      if (!sessionJson) return null;
      
      const sessionData = JSON.parse(sessionJson);
      const timestamp = await AsyncStorage.getItem('sportsengine_session_timestamp');
      
      // Check if session is expired (24 hours)
      if (timestamp && Date.now() - parseInt(timestamp) > 86400000) {
        await this.clearSession();
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Error getting stored session:', error);
      return null;
    }
  }

  /**
   * Clear stored session data
   */
  async clearSession() {
    try {
      await AsyncStorage.removeItem('sportsengine_session');
      await AsyncStorage.removeItem('sportsengine_session_timestamp');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(token = null) {
    if (token) {
      // Check if provided token is valid by making a test request
      try {
        const response = await fetch(`${this.backendUrl}/api/sportsengine/preview`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        return response.ok;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
    } else {
      // Check stored session
      const sessionData = await this.getStoredSession();
      return sessionData && sessionData.cookies;
    }
  }

  /**
   * Get user's organizations from SportsEngine
   */
  async getOrganizations() {
    try {
      const sessionData = await this.getStoredSession();
      if (!sessionData) {
        throw new Error('No active session. Please authenticate first.');
      }

      const response = await fetch(`${this.backendUrl}/api/sportsengine/organizations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      return data.organizations;
    } catch (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }
  }

  /**
   * Get teams for a specific organization
   */
  async getTeamsForOrganization(organizationId) {
    try {
      const sessionData = await this.getStoredSession();
      if (!sessionData) {
        throw new Error('No active session. Please authenticate first.');
      }

      const response = await fetch(`${this.backendUrl}/api/sportsengine/organizations/${organizationId}/teams`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      return data.teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }

  /**
   * Get roster for a specific team
   */
  async getTeamRoster(teamId) {
    try {
      const sessionData = await this.getStoredSession();
      if (!sessionData) {
        throw new Error('No active session. Please authenticate first.');
      }

      const response = await fetch(`${this.backendUrl}/api/sportsengine/teams/${teamId}/roster`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team roster');
      }

      const data = await response.json();
      return data.roster;
    } catch (error) {
      console.error('Error fetching team roster:', error);
      throw error;
    }
  }

  /**
   * Get all data for migration preview
   */
  async getMigrationPreview() {
    try {
      const sessionData = await this.getStoredSession();
      if (!sessionData) {
        throw new Error('No active session. Please authenticate first.');
      }

      const response = await fetch(`${this.backendUrl}/api/sportsengine/migration-preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch migration preview');
      }

      const data = await response.json();
      return data.preview;
    } catch (error) {
      console.error('Error fetching migration preview:', error);
      throw error;
    }
  }

  /**
   * Test the connection with stored credentials
   */
  async testConnection() {
    try {
      const sessionData = await this.getStoredSession();
      if (!sessionData) {
        return { success: false, error: 'No active session' };
      }

      const response = await fetch(`${this.backendUrl}/api/sportsengine/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, error: 'Connection test failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate credentials without storing session
   */
  async validateCredentials(email, password) {
    try {
      const response = await fetch(`${this.backendUrl}/api/sportsengine/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credential validation failed');
      }

      const result = await response.json();
      return { success: result.valid, message: result.message };
    } catch (error) {
      console.error('Credential validation error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SportsEngineScrapingService();
