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
import { useTheme } from '../contexts/ThemeContext';
import { groupService } from '../services/database';
import { imageUploadService } from '../services/imageUpload';
import { aiImageService } from '../services/aiImageService';

const CreateGroupScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const groupType = route?.params?.groupType || 'group'; // Default to 'group' if not specified
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
  
  // AI Generation states
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [aiStyle, setAiStyle] = useState('dynamic');
  const [customPrompt, setCustomPrompt] = useState('');

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

  const handleGenerateAI = async () => {
    if (!customPrompt.trim()) {
      Alert.alert('Error', 'Please describe what you want in your cover photo to generate an AI image');
      return;
    }

    setAiGenerating(true);
    
    try {
      console.log('🎨 Generating AI cover photo...');
      const result = await aiImageService.generateCoverPhoto(
        groupName.trim(),
        sport,
        groupType,
        aiStyle,
        customPrompt.trim()
      );

      if (result.success) {
        setCoverImage(result.imageUrl);
        setShowAiOptions(false);
        Alert.alert(
          'Success!', 
          'AI cover photo generated successfully! You can generate a new one or proceed to create your group.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate AI cover photo');
      }
    } catch (error) {
      console.error('❌ AI Generation Error:', error);
      Alert.alert('Error', 'Failed to generate AI cover photo. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', `Please enter a ${groupType === 'team' ? 'team' : 'group'} title`);
      return;
    }

    setLoading(true);
    
    try {
      let coverPhotoUrl = null;
      
      // Upload cover photo if selected
      if (coverImage) {
        console.log('Processing cover photo...');
        
        // Check if it's an AI-generated image (external URL) or local file
        const isExternalUrl = coverImage.startsWith('http://') || coverImage.startsWith('https://');
        
        if (isExternalUrl) {
          // AI-generated image - download and upload to Supabase
          console.log('Uploading AI-generated cover photo...');
          const uploadResult = await imageUploadService.uploadAIGeneratedCover(
            coverImage,
            `${user.id}-${Date.now()}`
          );
          
          if (uploadResult.success) {
            coverPhotoUrl = uploadResult.url;
            console.log('AI cover photo uploaded successfully:', coverPhotoUrl);
          } else {
            console.error('AI cover photo upload failed:', uploadResult.error);
            Alert.alert(
              'Warning', 
              'Cover photo upload failed, but we\'ll create the group anyway. You can add a cover photo later.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
                { text: 'Continue', onPress: () => {} }
              ]
            );
          }
        } else {
          // Local image - upload directly
          console.log('Uploading local cover photo...');
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
      }

      // Create group in database
      const groupData = {
        name: groupName.trim(),
        sport: sport || 'General',
        leader_id: user.id,
        description: description,
        season: new Date().getFullYear().toString(),
        cover_photo_url: coverPhotoUrl,
        group_type: groupType, // 'group' or 'team'
      };

      const result = await groupService.createGroup(groupData);

      if (result.success) {
        Alert.alert(
          'Success!', 
          `${groupType === 'team' ? 'Team' : 'Group'} "${groupName}" has been created successfully!${coverPhotoUrl ? ' Your cover photo has been uploaded.' : ''}`,
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
    <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]} onPress={onPress}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <View style={styles.settingRight}>
        <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{value}</Text>
        {showArrow && <Ionicons name="chevron-forward" size={20} color="#007AFF" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Create {groupType === 'team' ? 'Team' : 'Group'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={[styles.titleSection, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.titleInput, { color: theme.colors.text }]}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter a title"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>

          {/* Sport Selection */}
          <View style={[styles.sportSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {groupType === 'team' ? 'Sport *' : 'Activity/Sport'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScrollView}>
              <View style={styles.sportChips}>
                {sports.map((sportOption) => (
                  <TouchableOpacity
                    key={sportOption}
                    style={[
                      styles.sportChip,
                      { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      sport === sportOption && { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                    ]}
                    onPress={() => setSport(sportOption)}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        { color: theme.colors.textSecondary },
                        sport === sportOption && { color: '#ffffff' }
                      ]}
                    >
                      {sportOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Cover Photo Section */}
          <View style={[styles.coverPhotoSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>
              Cover Photo
            </Text>
            
            {coverImage ? (
              <View style={styles.coverPhotoPreview}>
                <Image source={{ uri: coverImage }} style={styles.coverPreview} />
                <View style={styles.coverPhotoOverlay}>
                  <View style={styles.coverPhotoActions}>
                    <TouchableOpacity 
                      style={[styles.photoActionButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]} 
                      onPress={pickImage}
                    >
                      <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                      <Text style={[styles.photoActionText, { color: "#FFFFFF" }]}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.photoActionButton, { backgroundColor: aiGenerating ? 'rgba(0,0,0,0.4)' : 'rgba(255,107,107,0.9)' }]} 
                      onPress={() => setShowAiOptions(true)}
                      disabled={aiGenerating}
                    >
                      <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                      <Text style={[styles.photoActionText, { color: "#FFFFFF" }]}>
                        {aiGenerating ? 'Generating...' : 'AI Generate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.coverPhotoGrid}>
                <TouchableOpacity 
                  style={[styles.coverPhotoCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} 
                  onPress={pickImage}
                >
                  <View style={[styles.coverPhotoCardIcon, { backgroundColor: '#007AFF15' }]}>
                    <Ionicons name="image-outline" size={28} color="#007AFF" />
                  </View>
                  <Text style={[styles.coverPhotoCardTitle, { color: theme.colors.text }]}>Upload Photo</Text>
                  <Text style={[styles.coverPhotoCardSubtitle, { color: theme.colors.textSecondary }]}>
                    Choose from library
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.coverPhotoCard, 
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    aiGenerating && { opacity: 0.6 }
                  ]} 
                  onPress={() => setShowAiOptions(true)}
                  disabled={aiGenerating}
                >
                  <View style={[styles.coverPhotoCardIcon, { backgroundColor: '#FF6B6B15' }]}>
                    <Ionicons 
                      name={aiGenerating ? "hourglass-outline" : "sparkles-outline"} 
                      size={28} 
                      color="#FF6B6B" 
                    />
                  </View>
                  <Text style={[styles.coverPhotoCardTitle, { color: theme.colors.text }]}>
                    {aiGenerating ? 'Generating...' : 'AI Generate'}
                  </Text>
                  <Text style={[styles.coverPhotoCardSubtitle, { color: theme.colors.textSecondary }]}>
                    {aiGenerating ? 'Please wait...' : 'Create with AI'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>


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

        {/* AI Style Selection Modal - Moved outside ScrollView */}
        {showAiOptions && (
          <KeyboardAvoidingView 
            style={styles.aiModalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableOpacity 
              style={styles.aiModalBackdrop}
              activeOpacity={1}
              onPress={() => setShowAiOptions(false)}
            />
            <View style={[styles.aiOptionsModal, { backgroundColor: theme.colors.surface }]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.aiModalContent}
              >
                <View style={styles.aiModalHeader}>
                  <Text style={[styles.aiOptionsTitle, { color: theme.colors.text }]}>Create AI Cover Photo</Text>
                  <TouchableOpacity 
                    style={styles.aiModalClose}
                    onPress={() => setShowAiOptions(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Custom Prompt Input */}
                <View style={styles.promptSection}>
                  <Text style={[styles.promptLabel, { color: theme.colors.text }]}>
                    Describe your ideal cover photo *
                  </Text>
                  <TextInput
                    style={[
                      styles.promptInput,
                      { 
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }
                    ]}
                    value={customPrompt}
                    onChangeText={setCustomPrompt}
                    placeholder="e.g., sunset over a soccer field, team celebrating victory, modern gym interior, abstract geometric design, mountain landscape..."
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <Text style={[styles.promptCounter, { color: theme.colors.textTertiary }]}>
                    {customPrompt.length}/200
                  </Text>
                </View>

                {/* Style Selection */}
                <Text style={[styles.styleLabel, { color: theme.colors.text }]}>
                  Choose Style
                </Text>
                
                <View style={styles.aiStyleGrid}>
                  {[
                    { key: 'dynamic', label: 'Dynamic', desc: 'Action-packed and energetic', icon: 'flash-outline' },
                    { key: 'clean', label: 'Clean', desc: 'Minimalist and professional', icon: 'shapes-outline' },
                    { key: 'scenic', label: 'Scenic', desc: 'Beautiful landscapes', icon: 'leaf-outline' },
                    { key: 'abstract', label: 'Abstract', desc: 'Artistic and modern', icon: 'color-palette-outline' }
                  ].map((style) => (
                    <TouchableOpacity
                      key={style.key}
                      style={[
                        styles.aiStyleCard,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                        aiStyle === style.key && { borderColor: '#FF6B6B', backgroundColor: '#FF6B6B15' }
                      ]}
                      onPress={() => setAiStyle(style.key)}
                    >
                      <View style={[
                        styles.aiStyleIcon,
                        { backgroundColor: aiStyle === style.key ? '#FF6B6B20' : theme.colors.surface }
                      ]}>
                        <Ionicons 
                          name={style.icon} 
                          size={24} 
                          color={aiStyle === style.key ? '#FF6B6B' : theme.colors.textSecondary} 
                        />
                      </View>
                      <Text style={[styles.aiStyleLabel, { color: theme.colors.text }]}>{style.label}</Text>
                      <Text style={[styles.aiStyleDesc, { color: theme.colors.textSecondary }]}>{style.desc}</Text>
                      {aiStyle === style.key && (
                        <View style={styles.aiStyleSelected}>
                          <Ionicons name="checkmark-circle" size={20} color="#FF6B6B" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <View style={[styles.aiModalActions, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity 
                  style={[styles.aiModalButton, styles.aiCancelButton, { borderColor: theme.colors.border }]} 
                  onPress={() => setShowAiOptions(false)}
                >
                  <Text style={[styles.aiModalButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.aiModalButton, styles.aiGenerateButton, aiGenerating && { opacity: 0.6 }]} 
                  onPress={handleGenerateAI}
                  disabled={aiGenerating}
                >
                  {aiGenerating && <Ionicons name="hourglass-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />}
                  <Text style={styles.aiGenerateButtonText}>
                    {aiGenerating ? 'Generating...' : 'Generate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  // Sport Selection Styles
  sportSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  sportScrollView: {
    flexGrow: 0,
  },
  sportChips: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  sportChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Enhanced Cover Photo Styles
  coverPhotoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  coverPhotoCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  coverPhotoCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  coverPhotoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  coverPhotoCardSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  coverPhotoPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  coverPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
  },
  coverPhotoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Enhanced AI Modal Styles
  aiModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  aiModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  aiOptionsModal: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  aiModalContent: {
    padding: 24,
    paddingBottom: 0,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  aiModalClose: {
    padding: 4,
  },
  aiStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  aiStyleCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  aiStyleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aiStyleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  aiStyleDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  aiStyleSelected: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  aiModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  aiModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  aiCancelButton: {
    borderWidth: 1.5,
  },
  aiGenerateButton: {
    backgroundColor: '#FF6B6B',
  },
  aiModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  aiGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom Prompt Styles
  promptSection: {
    marginBottom: 20,
  },
  promptLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  promptInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 80,
    maxHeight: 120,
  },
  promptCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  styleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default CreateGroupScreen;
