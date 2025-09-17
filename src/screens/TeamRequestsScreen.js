import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { teamService } from '../services/database';

const TeamRequestsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { teamId, teamName } = route.params;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const teamRequests = await teamService.getTeamJoinRequests(teamId);
      setRequests(teamRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const processRequest = async (requestId, status) => {
    try {
      const result = await teamService.processJoinRequest(requestId, status, user.id);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`
        );
        loadRequests(); // Reload to remove processed request
      } else {
        Alert.alert('Error', result.error || `Failed to ${status} request`);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      Alert.alert('Error', `Failed to ${status} request`);
    }
  };

  const confirmProcessRequest = (request, status) => {
    const action = status === 'approved' ? 'approve' : 'reject';
    const playerName = request.request_type === 'player' 
      ? request.profiles.name 
      : request.player_profile?.name || 'Unknown Player';
    
    const message = request.request_type === 'player'
      ? `${action} ${request.profiles.name}'s request to join the team?`
      : `${action} ${request.profiles.name}'s request for ${playerName} to join the team?`;

    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Request`,
      `Are you sure you want to ${message}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: () => processRequest(request.id, status)
        }
      ]
    );
  };

  const renderRequest = ({ item: request }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {request.profiles.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{request.profiles.name}</Text>
            <Text style={styles.userEmail}>{request.profiles.email}</Text>
            <Text style={styles.requestType}>
              {request.request_type === 'player' 
                ? 'Player Request' 
                : `Parent Request for ${request.player_profile?.name || 'Unknown Player'}`}
            </Text>
          </View>
        </View>
        <Text style={styles.requestDate}>
          {new Date(request.requested_at).toLocaleDateString()}
        </Text>
      </View>

      {request.message && (
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => confirmProcessRequest(request, 'rejected')}
        >
          <Ionicons name="close" size={20} color="#fff" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => confirmProcessRequest(request, 'approved')}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Join Requests</Text>
          <Text style={styles.headerSubtitle}>{teamName}</Text>
        </View>
        <View style={styles.placeholder} />
      </LinearGradient>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptySubtitle}>
              Join requests will appear here for you to review
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 34,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestType: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  messageSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 5,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default TeamRequestsScreen;
