import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPORTSENGINE_CONFIG, validateSportsEngineConfig, getRedirectUri } from '../config/sportsengine';

class SportsEngineService {
  constructor() {
    this.clientId = SPORTSENGINE_CONFIG.CLIENT_ID;
    this.clientSecret = SPORTSENGINE_CONFIG.CLIENT_SECRET;
    this.redirectUri = getRedirectUri();
    this.baseUrl = SPORTSENGINE_CONFIG.AUTH_BASE_URL;
    this.apiUrl = SPORTSENGINE_CONFIG.API_BASE_URL;
    this.tokenExpiryTime = SPORTSENGINE_CONFIG.TOKEN_EXPIRY_TIME;
  }

  /**
   * Validate configuration before making requests
   */
  validateConfig() {
    const validation = validateSportsEngineConfig();
    if (!validation.isValid) {
      throw new Error(`SportsEngine configuration incomplete: ${validation.issues.join(', ')}`);
    }
  }

  /**
   * Initiate OAuth flow with SportsEngine
   */
  async authenticate() {
    try {
      this.validateConfig();
      const authUrl = `${this.baseUrl}/oauth/authorize?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
        `response_type=code`;

      console.log('Opening SportsEngine auth URL:', authUrl);
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, this.redirectUri);
      
      if (result.type === 'success') {
        const url = result.url;
        const code = this.extractCodeFromUrl(url);
        
        if (code) {
          const tokens = await this.exchangeCodeForTokens(code);
          await this.storeTokens(tokens);
          return { success: true, tokens };
        } else {
          throw new Error('No authorization code received');
        }
      } else {
        throw new Error('Authentication cancelled or failed');
      }
    } catch (error) {
      console.error('SportsEngine authentication error:', error);
      Alert.alert('Authentication Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract authorization code from callback URL
   */
  extractCodeFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('code');
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorData}`);
      }

      const tokens = await response.json();
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Store tokens securely
   */
  async storeTokens(tokens) {
    try {
      await AsyncStorage.setItem('sportsengine_tokens', JSON.stringify(tokens));
      await AsyncStorage.setItem('sportsengine_token_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Get stored tokens
   */
  async getStoredTokens() {
    try {
      const tokensJson = await AsyncStorage.getItem('sportsengine_tokens');
      if (!tokensJson) return null;
      
      const tokens = JSON.parse(tokensJson);
      const timestamp = await AsyncStorage.getItem('sportsengine_token_timestamp');
      
      // Check if tokens are expired
      if (timestamp && Date.now() - parseInt(timestamp) > this.tokenExpiryTime) {
        await this.clearTokens();
        return null;
      }
      
      return tokens;
    } catch (error) {
      console.error('Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    try {
      await AsyncStorage.removeItem('sportsengine_tokens');
      await AsyncStorage.removeItem('sportsengine_token_timestamp');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const tokens = await this.getStoredTokens();
    return tokens && tokens.access_token;
  }

  /**
   * Make authenticated GraphQL request to SportsEngine API
   */
  async makeGraphQLRequest(query, variables = {}) {
    try {
      const tokens = await this.getStoredTokens();
      if (!tokens || !tokens.access_token) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error('GraphQL request error:', error);
      throw error;
    }
  }

  /**
   * Get user's organizations from SportsEngine
   */
  async getOrganizations() {
    const query = `
      query GetOrganizations($page: Int, $perPage: Int) {
        organizations(page: $page, perPage: $perPage) {
          pageInformation {
            pages
            count
            page
            perPage
          }
          results {
            id
            name
            description
            website
            logoUrl
            status
            created
            updated
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { page: 1, perPage: 100 });
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
    const query = `
      query GetTeams($organizationId: ID!, $page: Int, $perPage: Int) {
        teams(organizationId: $organizationId, page: $page, perPage: $perPage) {
          pageInformation {
            pages
            count
            page
            perPage
          }
          results {
            id
            name
            gender
            type
            sport
            status
            rosterStatus
            created
            updated
            program {
              primaryName
              secondaryName
            }
            players {
              firstName
              lastName
              profileId
              rosterStatus
              jerseyNumber
            }
            staff {
              firstName
              lastName
              profileId
              rosterStatus
              title
            }
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { 
        organizationId, 
        page: 1, 
        perPage: 100 
      });
      return data.teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  }

  /**
   * Get detailed profile information
   */
  async getProfile(profileId) {
    const query = `
      query GetProfile($profileId: ID!) {
        profile(id: $profileId) {
          id
          firstName
          lastName
          email
          phone
          dateOfBirth
          address {
            street
            city
            state
            zipCode
          }
          emergencyContact {
            name
            phone
            relationship
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { profileId });
      return data.profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Get events for a team
   */
  async getEventsForTeam(teamId) {
    const query = `
      query GetEvents($teamId: ID!, $page: Int, $perPage: Int) {
        events(teamId: $teamId, page: $page, perPage: $perPage) {
          pageInformation {
            pages
            count
            page
            perPage
          }
          results {
            id
            title
            description
            startDate
            endDate
            location {
              name
              address
              city
              state
            }
            type
            status
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { 
        teamId, 
        page: 1, 
        perPage: 100 
      });
      return data.events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  /**
   * Test the connection with a simple query
   */
  async testConnection() {
    try {
      const query = `
        query TestConnection {
          organizations(page: 1, perPage: 1) {
            pageInformation {
              count
            }
          }
        }
      `;
      
      await this.makeGraphQLRequest(query);
      return { success: true };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SportsEngineService();
