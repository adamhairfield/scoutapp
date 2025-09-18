import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/database';
import { imageUploadService } from '../services/imageUpload';

const CreateGroupScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [privacySetting, setPrivacySetting] = useState('Public');
  const [notificationSetting, setNotificationSetting] = useState('Default');
  const [imageFiltering, setImageFiltering] = useState('Off');
  const [textFiltering, setTextFiltering] = useState('Off');
  const [countdown, setCountdown] = useState('Off');
  const [loading, setLoading] = useState(false);

  const sports = [
    'Soccer', 'Basketball', 'Baseball', 'Football', 'Tennis', 
    'Swimming', 'Track & Field', 'Volleyball', 'Hockey', 'Other'
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCoverImage(result.assets[0].uri);
        Alert.alert('Success', 'Cover photo selected! It will be uploaded when you create the group.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not access photo library. Please try again.');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group title');
      return;
    }

    setLoading(true);
    
    try {
      let coverPhotoUrl = null;
      
      // Upload cover photo if selected
      if (coverImage) {
        console.log('Uploading cover photo...');
        const uploadResult = await imageUploadService.uploadGroupCover(
          coverImage, 
          `${user.id}-${Date.now()}`
        );
        
        if (uploadResult.success) {
          coverPhotoUrl = uploadResult.url;
          console.log('Cover photo uploaded successfully:', coverPhotoUrl);
        } else {
          console.error('Cover photo upload failed:', uploadResult.error);
          Alert.alert(
            'Warning', 
            'Cover photo upload failed, but we\'ll create the group anyway. You can add a cover photo later.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Continue', onPress: () => {} }
            ]
          );
        }
      }

      // Create group in database
      const groupData = {
        name: groupName.trim(),
        sport: sport || 'General',
        leader_id: user.id,
        description: description,
        season: new Date().getFullYear().toString(),
        cover_photo_url: coverPhotoUrl,
      };

      const result = await groupService.createGroup(groupData);

      if (result.success) {
        Alert.alert(
          'Success!', 
          `Group "${groupName}" has been created successfully!${coverPhotoUrl ? ' Your cover photo has been uploaded.' : ''}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SettingRow = ({ title, subtitle, value, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.settingRight}>
        <Text style={styles.settingValue}>{value}</Text>
        {showArrow && <Ionicons name="chevron-forward" size={20} color="#007AFF" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Group</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.titleSection}>
            <TextInput
              style={styles.titleInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter a title"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          {/* Cover Photo */}
          <TouchableOpacity style={styles.coverPhotoSection} onPress={pickImage}>
            <View style={styles.coverPhotoContent}>
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverPreview} />
              ) : (
                <View style={styles.coverPhotoIcon}>
                  <Ionicons name="image-outline" size={24} color="#8E8E93" />
                </View>
              )}
              <View style={styles.coverPhotoText}>
                <Text style={styles.coverPhotoTitle}>
                  {coverImage ? 'Change Cover Photo' : 'Add Cover Photo'}
                </Text>
                <Text style={styles.coverPhotoSubtitle}>
                  {coverImage 
                    ? 'Tap to select a different image'
                    : 'Upload an image or create your own custom cover'
                  }
                </Text>
              </View>
            </View>
            <Ionicons name={coverImage ? "checkmark" : "add"} size={24} color={coverImage ? "#34C759" : "#8E8E93"} />
          </TouchableOpacity>

          {/* Settings Sections */}
          <View style={styles.settingsContainer}>
            <SettingRow
              title="Privacy Settings"
              subtitle="Choose how people find and join your group."
              value={privacySetting}
              onPress={() => {
                Alert.alert(
                  'Privacy Settings',
                  'Choose privacy level',
                  [
                    { text: 'Public', onPress: () => setPrivacySetting('Public') },
                    { text: 'Private', onPress: () => setPrivacySetting('Private') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />

            <SettingRow
              title="Notifications"
              subtitle="Select the default notifications for your new group members. Group members can set their own settings after joining."
              value={notificationSetting}
              onPress={() => {
                Alert.alert(
                  'Notifications',
                  'Choose notification level',
                  [
                    { text: 'Default', onPress: () => setNotificationSetting('Default') },
                    { text: 'All', onPress: () => setNotificationSetting('All') },
                    { text: 'None', onPress: () => setNotificationSetting('None') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />

            <SettingRow
              title="Image Filtering"
              subtitle="Set filters to prohibit offensive images from being posted in this Group"
              value={imageFiltering}
              onPress={() => {
                Alert.alert(
                  'Image Filtering',
                  'Enable image filtering?',
                  [
                    { text: 'On', onPress: () => setImageFiltering('On') },
                    { text: 'Off', onPress: () => setImageFiltering('Off') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />

            <SettingRow
              title="Text Filtering"
              subtitle="Set filters to prohibit offensive text from being posted in this Group"
              value={textFiltering}
              onPress={() => {
                Alert.alert(
                  'Text Filtering',
                  'Enable text filtering?',
                  [
                    { text: 'On', onPress: () => setTextFiltering('On') },
                    { text: 'Off', onPress: () => setTextFiltering('Off') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />

            <SettingRow
              title="About and Rules"
              subtitle="Add a description, photos, bios, expectations for member behavior, and resources related to this Group"
              value=""
              onPress={() => {
                Alert.alert(
                  'About and Rules',
                  'This feature will be available soon!',
                  [{ text: 'OK' }]
                );
              }}
            />

            <SettingRow
              title="Countdown"
              subtitle="Something big coming? Use our countdown clock to create excitement"
              value={countdown}
              onPress={() => {
                Alert.alert(
                  'Countdown',
                  'Enable countdown?',
                  [
                    { text: 'On', onPress: () => setCountdown('On') },
                    { text: 'Off', onPress: () => setCountdown('Off') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }}
            />
          </View>

          {/* Create Button */}
          <View style={styles.createButtonContainer}>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating Group...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 50,
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 35,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleInput: {
    fontSize: 17,
    color: '#000',
  },
  coverPhotoSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 35,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coverPhotoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coverPhotoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coverPhotoText: {
    flex: 1,
  },
  coverPhotoTitle: {
    fontSize: 17,
    color: '#000',
    marginBottom: 2,
  },
  coverPhotoSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  coverPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  settingsContainer: {
    marginTop: 35,
  },
  settingRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 17,
    color: '#000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 17,
    color: '#007AFF',
    marginRight: 8,
  },
  createButtonContainer: {
    padding: 16,
    marginTop: 35,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreateGroupScreen;
