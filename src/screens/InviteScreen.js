import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/database';

const InviteScreen = ({ navigation, route }) => {
  const { inviteToken } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user && inviteToken) {
      processInvite();
    }
  }, [user, inviteToken]);

  const processInvite = async () => {
    try {
      setLoading(true);
      const result = await groupService.useInviteLink(inviteToken);
      
      if (result.success) {
        // Successfully joined the group
        Alert.alert(
          'Welcome!',
          result.message,
          [
            {
              text: 'Go to Group',
              onPress: () => {
                navigation.replace('MainTabs');
                // Navigate to the group after a short delay
                setTimeout(() => {
                  navigation.navigate('GroupDetails', {
                    group: { id: result.group_id, name: result.group_name }
                  });
                }, 100);
              }
            }
          ]
        );
      } else {
        setInviteInfo({
          error: result.error,
          groupName: result.group_name
        });
      }
    } catch (error) {
      console.error('Error processing invite:', error);
      setInviteInfo({
        error: 'Failed to process invite link'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    processInvite();
  };

  const handleGoHome = () => {
    navigation.replace('MainTabs');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Processing invite...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={inviteInfo?.error ? "close-circle" : "checkmark-circle"} 
              size={80} 
              color="#fff" 
            />
          </View>
          
          <Text style={styles.title}>
            {inviteInfo?.error ? 'Invite Error' : 'Invite Processed'}
          </Text>
          
          <Text style={styles.message}>
            {inviteInfo?.error || 'Something went wrong'}
          </Text>
          
          {inviteInfo?.groupName && (
            <Text style={styles.groupName}>
              Group: {inviteInfo.groupName}
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            {inviteInfo?.error && (
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={handleRetry}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, styles.homeButton]} 
              onPress={handleGoHome}
            >
              <Text style={styles.buttonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  homeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InviteScreen;
