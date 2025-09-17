import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/database';

const JoinByInviteScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      const result = await groupService.useInviteLink(inviteCode.trim());
      
      if (result.success) {
        Alert.alert(
          'Success!',
          result.message,
          [
            {
              text: 'Go to Group',
              onPress: () => {
                navigation.navigate('MainTabs');
                // Navigate to groups tab
                setTimeout(() => {
                  navigation.navigate('Groups');
                }, 100);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Group</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={80} color="#fff" />
          </View>
          
          <Text style={styles.title}>Join a Group</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by a group leader
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter invite code"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#667eea" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#667eea" />
                <Text style={styles.joinButtonText}>Join Group</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Don't have an invite code?{'\n'}
              Ask a group leader to share one with you.
            </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 30,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default JoinByInviteScreen;
