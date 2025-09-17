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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { teamService } from '../services/database';

const TeamsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      let userTeams = [];

      if (user.role === 'coach') {
        // Get teams where user is the coach
        userTeams = await teamService.getCoachTeams(user.id);
      } else {
        // Get teams where user is a member
        userTeams = await teamService.getUserTeams(user.id);
      }

      setTeams(userTeams || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    setRefreshing(false);
  };

  const handleCreateTeam = () => {
    navigation.navigate('CreateTeam');
  };

  const handleViewRequests = (team) => {
    navigation.navigate('TeamRequests', { 
      teamId: team.id, 
      teamName: team.name 
    });
  };

  const handleTeamPress = (team) => {
    // Navigate to team details (you can implement this later)
    Alert.alert('Team Selected', `Selected: ${team.name}`);
  };

  const renderTeamCard = ({ item: team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => handleTeamPress(team)}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.teamGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </View>
        <Text style={styles.teamSport}>{team.sport}</Text>
        <View style={styles.teamStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#fff" />
            <Text style={styles.statText}>{team.member_count || 0} members</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="key" size={16} color="#fff" />
            <Text style={styles.statText}>Code: {team.join_code}</Text>
          </View>
        </View>
        {user.role === 'coach' && (
          <TouchableOpacity
            style={styles.requestsButton}
            onPress={() => handleViewRequests(team)}
          >
            <Ionicons name="mail" size={16} color="#fff" />
            <Text style={styles.requestsButtonText}>View Requests</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {user.role === 'coach' ? 'No Teams Created' : 'No Teams Joined'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {user.role === 'coach'
          ? 'Create your first team to get started'
          : 'Join a team to see it here'}
      </Text>
      {user.role === 'coach' ? (
        <TouchableOpacity style={styles.createButton} onPress={handleCreateTeam}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Team</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('JoinTeam')}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Join Team</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>My Teams</Text>
        {user.role === 'coach' && teams.length > 0 && (
          <TouchableOpacity style={styles.headerButton} onPress={handleCreateTeam}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <FlatList
        data={teams}
        renderItem={renderTeamCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  teamCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  teamGradient: {
    padding: 20,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  teamSport: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginLeft: 5,
  },
  requestsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  requestsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TeamsScreen;
