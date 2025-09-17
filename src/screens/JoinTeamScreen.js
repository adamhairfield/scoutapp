import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { teamService, parentPlayerService } from '../services/database';

const JoinTeamScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [foundTeam, setFoundTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [children, setChildren] = useState([]);
  const [message, setMessage] = useState('');

  const searchTeam = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a team join code');
      return;
    }

    try {
      setLoading(true);
      const team = await teamService.findTeamByJoinCode(joinCode.trim());
      
      if (team) {
        setFoundTeam(team);
        
        // If user is a parent, load their children
        if (user.role === 'parent') {
          const parentChildren = await parentPlayerService.getParentChildren(user.id);
          setChildren(parentChildren);
          
          // If no children found, show alert with guidance
          if (parentChildren.length === 0) {
            Alert.alert(
              'No Children Found',
              'You need to link your child\'s account first. Please go to your Profile and manage relationships to add your child.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
              ]
            );
            return;
          }
        }
      } else {
        Alert.alert('Team Not Found', 'No team found with that join code. Please check the code and try again.');
        setFoundTeam(null);
      }
    } catch (error) {
      console.error('Error searching for team:', error);
      Alert.alert('Error', 'Failed to search for team');
    } finally {
      setLoading(false);
    }
  };

  const submitJoinRequest = async () => {
    if (!foundTeam) return;

    try {
      setLoading(true);
      let requestType = user.role;
      let playerId = null;

      if (user.role === 'parent') {
        if (!selectedPlayer) {
          Alert.alert('Error', 'Please select which child you want to join the team');
          return;
        }
        playerId = selectedPlayer.id;
      }

      const result = await teamService.createJoinRequest(
        foundTeam.id,
        user.id,
        requestType,
        playerId,
        message.trim()
      );

      if (result.success) {
        Alert.alert(
          'Request Sent!',
          'Your join request has been sent to the coach. You will be notified when it is reviewed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send join request');
      }
    } catch (error) {
      console.error('Error submitting join request:', error);
      Alert.alert('Error', 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerSelection = () => {
    if (user.role !== 'parent' || children.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Child to Join Team:</Text>
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.playerOption,
              selectedPlayer?.id === child.id && styles.selectedPlayerOption
            ]}
            onPress={() => setSelectedPlayer(child)}
          >
            <View style={styles.playerInfo}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerInitial}>
                  {child.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.playerName}>{child.name}</Text>
                <Text style={styles.playerEmail}>{child.email}</Text>
              </View>
            </View>
            {selectedPlayer?.id === child.id && (
              <Ionicons name="checkmark-circle" size={24} color="#667eea" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Join Team</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Team Join Code</Text>
          <Text style={styles.sectionSubtitle}>
            Ask your coach for the team's join code
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.joinCodeInput}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Enter 8-character code"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.searchButtonDisabled]}
              onPress={searchTeam}
              disabled={loading}
            >
              <Text style={styles.searchButtonText}>
                {loading ? 'Searching...' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {foundTeam && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Found!</Text>
            
            <View style={styles.teamCard}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.teamGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.teamName}>{foundTeam.name}</Text>
                <Text style={styles.teamSport}>{foundTeam.sport}</Text>
                <Text style={styles.teamCoach}>
                  Coach: {foundTeam.profiles?.name || 'Unknown'}
                </Text>
                {foundTeam.description && (
                  <Text style={styles.teamDescription}>{foundTeam.description}</Text>
                )}
              </LinearGradient>
            </View>

            {renderPlayerSelection()}

            <View style={styles.messageSection}>
              <Text style={styles.sectionTitle}>Message to Coach (Optional)</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Introduce yourself or add any relevant information..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, loading && styles.joinButtonDisabled]}
              onPress={submitJoinRequest}
              disabled={loading || (user.role === 'parent' && !selectedPlayer)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.joinButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.joinButtonText}>
                  {loading ? 'Sending Request...' : 'Send Join Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinCodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#fff',
    textTransform: 'uppercase',
  },
  searchButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  teamCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  teamGradient: {
    padding: 20,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  teamSport: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 5,
  },
  teamCoach: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  teamDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlayerOption: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  playerEmail: {
    fontSize: 14,
    color: '#666',
  },
  messageSection: {
    marginTop: 10,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#fff',
  },
  joinButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default JoinTeamScreen;
