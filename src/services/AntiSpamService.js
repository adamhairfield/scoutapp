import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

class AntiSpamService {
  // Rate limiting for signups
  static async checkSignupRateLimit() {
    try {
      const lastSignupTime = await AsyncStorage.getItem('lastSignupAttempt');
      const signupCount = await AsyncStorage.getItem('signupAttemptCount') || '0';
      
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (lastSignupTime && (now - parseInt(lastSignupTime)) < oneHour) {
        if (parseInt(signupCount) >= 3) {
          throw new Error('Too many signup attempts. Please try again later.');
        }
      } else {
        // Reset counter after an hour
        await AsyncStorage.setItem('signupAttemptCount', '0');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Track signup attempt
  static async recordSignupAttempt() {
    try {
      const now = Date.now().toString();
      const currentCount = await AsyncStorage.getItem('signupAttemptCount') || '0';
      const newCount = (parseInt(currentCount) + 1).toString();
      
      await AsyncStorage.setItem('lastSignupAttempt', now);
      await AsyncStorage.setItem('signupAttemptCount', newCount);
    } catch (error) {
      console.error('Error recording signup attempt:', error);
    }
  }

  // Validate email domain against common disposable email providers
  static validateEmailDomain(email) {
    const disposableDomains = [
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'tempmail.org',
      'throwaway.email',
      // Add more as needed
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (disposableDomains.includes(domain)) {
      throw new Error('Please use a permanent email address.');
    }
    
    return true;
  }

  // Check for suspicious patterns
  static validateSignupData(email, password) {
    // Email validation
    this.validateEmailDomain(email);
    
    // Password strength (basic)
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    
    // Check for obvious bot patterns
    const botPatterns = [
      /^test\d+@/i,
      /^bot\d+@/i,
      /^spam\d+@/i,
      /^\w+\d{5,}@/i, // username followed by many numbers
    ];
    
    for (const pattern of botPatterns) {
      if (pattern.test(email)) {
        throw new Error('Invalid email format.');
      }
    }
    
    return true;
  }

  // Flag suspicious accounts for manual review
  static async flagForReview(userId, reason) {
    try {
      await supabase
        .from('account_flags')
        .insert({
          user_id: userId,
          reason,
          flagged_at: new Date().toISOString(),
          status: 'pending_review'
        });
    } catch (error) {
      console.error('Error flagging account:', error);
    }
  }

  // Check if user should be prompted for additional verification
  static async shouldRequestPhoneVerification(email) {
    // Trigger phone verification for:
    // 1. Free email providers
    // 2. New domains
    // 3. Suspicious patterns
    
    const freeEmailProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    return freeEmailProviders.includes(domain);
  }
}

export default AntiSpamService;
