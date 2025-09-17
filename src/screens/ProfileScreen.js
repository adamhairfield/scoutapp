import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    bio: 'Passionate soccer player with 5 years of experience. Love teamwork and always ready to give my best!',
    position: 'Midfielder',
    jerseyNumber: '10',
    achievements: ['MVP 2023', 'Top Scorer Regional League', 'Team Captain'],
    stats: {
      goals: 24,
      assists: 12,
      gamesPlayed: 18,
    },
    isPublic: true,
  });

  const handleSave = () => {
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const StatCard = ({ label, value, icon }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color="#667eea" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const AchievementBadge = ({ achievement }) => (
    <View style={styles.achievementBadge}>
      <Ionicons name="trophy" size={16} color="#FFD700" />
      <Text style={styles.achievementText}>{achievement}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons name={isEditing ? "checkmark" : "create"} size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#667eea" />
          </View>
          <View style={styles.jerseyNumber}>
            <Text style={styles.jerseyText}>#{profileData.jerseyNumber}</Text>
          </View>
        </View>

        <View style={styles.basicInfo}>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={profileData.name}
              onChangeText={(text) => setProfileData({...profileData, name: text})}
              placeholder="Your name"
            />
          ) : (
            <Text style={styles.playerName}>{profileData.name}</Text>
          )}
          
          <Text style={styles.userRole}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Text>

          {user.role === 'player' && (
            <Text style={styles.position}>{profileData.position}</Text>
          )}
        </View>

        {user.role === 'player' && (
          <View style={styles.publicToggle}>
            <Text style={styles.toggleLabel}>Public Profile</Text>
            <Switch
              value={profileData.isPublic}
              onValueChange={(value) => setProfileData({...profileData, isPublic: value})}
              trackColor={{ false: '#e9ecef', true: '#667eea' }}
              thumbColor={profileData.isPublic ? '#fff' : '#f4f3f4'}
            />
          </View>
        )}
      </View>

      {user.role === 'player' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Season Stats</Text>
            <View style={styles.statsContainer}>
              <StatCard label="Goals" value={profileData.stats.goals} icon="football" />
              <StatCard label="Assists" value={profileData.stats.assists} icon="hand-left" />
              <StatCard label="Games" value={profileData.stats.gamesPlayed} icon="calendar" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio</Text>
            {isEditing ? (
              <TextInput
                style={styles.bioInput}
                value={profileData.bio}
                onChangeText={(text) => setProfileData({...profileData, bio: text})}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.bioText}>{profileData.bio}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsContainer}>
              {profileData.achievements.map((achievement, index) => (
                <AchievementBadge key={index} achievement={achievement} />
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {(user.role === 'parent' || user.role === 'player') && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('ManageRelationships')}
          >
            <Ionicons name="people" size={24} color="#666" />
            <Text style={styles.settingText}>
              {user.role === 'parent' ? 'Manage Children' : 'Manage Parents'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications" size={24} color="#666" />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="shield-checkmark" size={24} color="#666" />
          <Text style={styles.settingText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle" size={24} color="#666" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={24} color="#FF6B35" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
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
  scrollContainer: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    padding: 5,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyNumber: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#667eea',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  basicInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#667eea',
    paddingBottom: 5,
    marginBottom: 5,
  },
  userRole: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  position: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  publicToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  bioText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  bioInput: {
    fontSize: 16,
    color: '#555',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    marginBottom: 10,
  },
  achievementText: {
    fontSize: 14,
    color: '#B8860B',
    marginLeft: 5,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#667eea',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
