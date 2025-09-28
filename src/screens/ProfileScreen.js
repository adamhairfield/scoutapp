import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import AppHeader from '../components/AppHeader';
import { profileService } from '../services/profileService';
import { friendsService } from '../services/friendsService';
import { groupService } from '../services/database';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUserProfile } = useAuth();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name || 'Adam Hairfield');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user.profile_picture_url || null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [profileData, setProfileData] = useState({
    name: user.name || 'Adam Hairfield',
    bio: '',
    coverPhoto: null,
    groups: '0',
    isPublic: true,
  });

  // Update status bar when screen is focused or theme changes
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(theme.mode === 'dark' ? 'light-content' : 'dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(theme.colors.background, true);
      }
    }, [theme.mode, theme.colors.background])
  );

  React.useEffect(() => {
    loadUserProfile();
    loadFriendsCount();
    loadGroupsCount();
  }, []);

  // Debug: Log editing state changes
  React.useEffect(() => {
    console.log('isEditingName changed to:', isEditingName);
  }, [isEditingName]);

  // Handle status bar when screen is focused/unfocused
  useFocusEffect(
    React.useCallback(() => {
      // Set white status bar when screen is focused
      StatusBar.setBarStyle('light-content');
      
      // Refresh counts when screen is focused
      refreshCounts();
      
      return () => {
        // Reset to dark status bar when screen is unfocused
        StatusBar.setBarStyle('dark-content');
      };
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const result = await profileService.getUserProfile(user.id);
      if (result.success && result.data) {
        setProfilePictureUrl(result.data.profile_picture_url);
        setProfileData(prev => ({
          ...prev,
          name: result.data.name || prev.name,
          bio: result.data.bio || prev.bio,
        }));
        setEditedBio(result.data.bio || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadFriendsCount = async () => {
    try {
      const result = await friendsService.getFriends(user.id);
      if (result.success) {
        setFriendsCount(result.data.length);
      }
    } catch (error) {
      console.error('Error loading friends count:', error);
    }
  };

  const loadGroupsCount = async () => {
    try {
      const groups = await groupService.getUserGroups(user.id);
      setGroupsCount(groups.length);
    } catch (error) {
      console.error('Error loading groups count:', error);
    }
  };

  const refreshCounts = async () => {
    await Promise.all([
      loadFriendsCount(),
      loadGroupsCount()
    ]);
  };

  const handleProfilePictureUpdate = async (newUrl) => {
    setProfilePictureUrl(newUrl);
    // Refresh the user profile in AuthContext so the avatar updates throughout the app
    await refreshUserProfile();
  };

  const handleNameLongPress = () => {
    console.log('Name long press detected!');
    Alert.alert(
      'Edit Name',
      'Would you like to edit your name?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => setIsEditingName(true) }
      ]
    );
  };

  const handleBioLongPress = () => {
    console.log('Bio long press detected!');
    Alert.alert(
      'Edit Bio',
      'Would you like to edit your bio?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => setIsEditingBio(true) }
      ]
    );
  };

  const handleNameSave = async () => {
    console.log('handleNameSave called!');
    console.log('Current editedName:', editedName);
    console.log('User object:', user);
    
    if (!editedName.trim()) {
      console.log('Name is empty, showing error');
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      console.log('Saving name:', editedName.trim(), 'for user:', user.id);
      
      // Update name in database
      const result = await profileService.updateProfileName(user.id, editedName.trim());
      
      if (result.success) {
        console.log('Name update successful, updating local state');
        
        // Update local state
        setProfileData(prev => ({ ...prev, name: editedName.trim() }));
        setIsEditingName(false);
        
        // Refresh user profile in AuthContext to update throughout app
        console.log('Refreshing user profile in AuthContext');
        await refreshUserProfile();
        
        Alert.alert('Success', 'Name updated successfully!');
      } else {
        console.error('Name update failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  const handleNameCancel = () => {
    console.log('handleNameCancel called');
    setEditedName(profileData.name);
    setIsEditingName(false);
  };

  const handleBioSave = async () => {
    try {
      const result = await profileService.updateUserBio(user.id, editedBio);
      
      if (result.success) {
        setProfileData(prev => ({
          ...prev,
          bio: editedBio
        }));
        setIsEditingBio(false);
        Alert.alert('Success', 'Bio updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to update bio');
      }
    } catch (error) {
      console.error('Error saving bio:', error);
      Alert.alert('Error', 'Failed to update bio');
    }
  };

  const handleBioCancel = () => {
    setEditedBio(profileData.bio);
    setIsEditingBio(false);
  };

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
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Ionicons name={icon} size={24} color="#667eea" />
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const AchievementBadge = ({ achievement }) => (
    <View style={styles.achievementBadge}>
      <Ionicons name="trophy" size={16} color="#FFD700" />
      <Text style={styles.achievementText}>{achievement}</Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        <StatusBar 
          barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.colors.background}
        />
        {/* Cover Photo Header */}
        <View style={styles.coverContainer}>
          <ProfilePictureUpload
            userId={user.id}
            currentImageUrl={profilePictureUrl || profileData.coverPhoto}
            onImageUpdate={handleProfilePictureUpdate}
            style={styles.coverImageContainer}
            size={width}
            isCoverPhoto={true}
          />
          {/* Top gradient for header visibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.topGradient}
          />
          
          {/* Bottom gradient for stats visibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.coverOverlay}
          />
          
          {/* Header */}
          <AppHeader 
            navigation={navigation}
            title="Scout"
            rightIcon="menu"
            onRightPress={() => navigation.navigate('Settings')}
          />

          {/* Stats Overlay */}
          <View style={styles.statsOverlay}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{friendsCount}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{groupsCount}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
          </View>
        </View>

        {/* Profile Info */}
        <View style={[styles.profileInfo, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.nameSection}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={[styles.nameInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  value={editedName}
                  onChangeText={(text) => {
                    console.log('Name text changed to:', text);
                    setEditedName(text);
                  }}
                  autoFocus={true}
                  selectTextOnFocus={true}
                  onSubmitEditing={() => {
                    console.log('Enter key pressed in text input');
                    handleNameSave();
                  }}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.placeholder}
                  maxLength={50}
                />
                <View style={styles.nameEditActions}>
                  <TouchableOpacity 
                    style={styles.nameActionButton} 
                    onPress={() => {
                      console.log('Cancel button pressed');
                      handleNameCancel();
                    }}
                  >
                    <Ionicons name="close" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.nameActionButton} 
                    onPress={() => {
                      console.log('Save button pressed');
                      handleNameSave();
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#34C759" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onLongPress={handleNameLongPress}
                delayLongPress={500}
                activeOpacity={0.8}
              >
                <Text style={[styles.profileName, { color: theme.colors.text }]}>{profileData.name}</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="checkmark-circle" size={20} color="#1DA1F2" style={styles.verifiedIcon} />
          </View>
      
          {/* Bio Section */}
          <View style={styles.bioSection}>
            {isEditingBio ? (
              <View style={styles.bioEditContainer}>
                <TextInput
                  style={[styles.bioInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  value={editedBio}
                  onChangeText={setEditedBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={theme.colors.placeholder}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <View style={styles.bioActions}>
                  <TouchableOpacity 
                    style={styles.bioActionButton} 
                    onPress={handleBioCancel}
                  >
                    <Ionicons name="close" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.bioActionButton} 
                    onPress={handleBioSave}
                  >
                    <Ionicons name="checkmark" size={16} color="#34C759" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onLongPress={handleBioLongPress}
                delayLongPress={500}
                activeOpacity={0.8}
                style={styles.bioContainer}
              >
                <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>
                  {profileData.bio || 'Long press to add your bio...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Settings Section */}
        <View style={[styles.settingsSection, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.border }]} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FF3B30" />
            <Text style={[styles.settingText, { color: '#FF3B30' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  coverContainer: {
    height: 400,
    position: 'relative',
  },
  coverImageContainer: {
    width: '100%',
    height: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  headerIcons: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  headerIcon: {
    padding: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    zIndex: 2,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  profileInfo: {
    padding: 20,
    alignItems: 'center',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  verifiedIcon: {
    marginTop: 2,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  nameEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  nameActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  profileTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  websiteLink: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 6,
  },
  friendsIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shareSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  shareText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  messageButton: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postOptions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 20,
  },
  postOption: {
    flex: 1,
    alignItems: 'center',
  },
  postOptionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  bioSection: {
    marginTop: 0,
  },
  bioContainer: {
    paddingHorizontal: 0,
    paddingVertical: 5,
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bioEditContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 15,
  },
  bioInput: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  bioActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ProfileScreen;
