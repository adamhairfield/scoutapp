import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { groupService } from '../services/database';
import { imageUploadService } from '../services/imageUpload';
import { aiImageService } from '../services/aiImageService';

const GroupOptionsModal = ({ visible, onClose, group, user, navigation, onGroupUpdate }) => {
  const { theme } = useTheme();
  const isLeader = group.leader_id === user.id;
  
  // AI Generation states
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStyle, setAiStyle] = useState('dynamic');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleInviteFriends = () => {
    onClose();
    // Navigate to invite screen or show invite modal
    Alert.alert('Invite Friends', 'Invite functionality will be implemented here');
  };

  const handleAdjustNotifications = () => {
    onClose();
    Alert.alert('Adjust Notifications', 'Notification settings will be implemented here');
  };

  const handleViewReports = () => {
    onClose();
    Alert.alert('View Reports', 'Reports functionality will be implemented here');
  };

  const handleGroupPrivacy = () => {
    if (!isLeader) {
      Alert.alert('Access Denied', 'Only group leaders can change privacy settings');
      return;
    }

    const currentVisibility = group.visibility || 'private';
    const visibilityOptions = [
      { value: 'public', title: 'Public', description: 'Anyone can find and join' },
      { value: 'private', title: 'Private', description: 'Invite only' },
      { value: 'hidden', title: 'Hidden', description: 'Completely private' }
    ];

    const buttons = visibilityOptions.map(option => ({
      text: `${option.title} - ${option.description}`,
      onPress: () => updateGroupVisibility(option.value),
      style: currentVisibility === option.value ? 'default' : 'default'
    }));

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Group Privacy Settings',
      `Current setting: ${visibilityOptions.find(opt => opt.value === currentVisibility)?.title || 'Private'}`,
      buttons
    );
  };

  const updateGroupVisibility = async (newVisibility) => {
    try {
      const result = await groupService.updateGroupVisibility(group.id, newVisibility, user.id);
      
      if (result.success) {
        // Update the group object
        group.visibility = newVisibility;
        Alert.alert(
          'Success',
          `Group privacy updated to ${newVisibility}`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  };

  const handleGroupSettings = () => {
    onClose();
    if (isLeader) {
      Alert.alert('Group Settings', 'Group settings will be implemented here');
    } else {
      Alert.alert('Access Denied', 'Only group leaders can access settings');
    }
  };

  const handleCreateRegistration = () => {
    onClose();
    if (isLeader) {
      navigation.navigate('CreateRegistration', { group });
    } else {
      Alert.alert('Access Denied', 'Only group leaders can create registrations');
    }
  };

  const handleViewRegistrations = () => {
    onClose();
    navigation.navigate('GroupRegistrations', { groupId: group.id, group });
  };

  const handleManageTabs = () => {
    onClose();
    if (isLeader) {
      Alert.alert('Manage Tabs', 'Tab management will be implemented here');
    } else {
      Alert.alert('Access Denied', 'Only group leaders can manage tabs');
    }
  };

  const handleEditHosts = () => {
    onClose();
    if (isLeader) {
      Alert.alert('Edit Hosts', 'Host management will be implemented here');
    } else {
      Alert.alert('Access Denied', 'Only group leaders can edit hosts');
    }
  };

  const handleRemoveMembers = () => {
    onClose();
    if (isLeader) {
      Alert.alert('Remove Members', 'Member removal will be implemented here');
    } else {
      Alert.alert('Access Denied', 'Only group leaders can remove members');
    }
  };

  const handleBlockMembers = () => {
    onClose();
    if (isLeader) {
      Alert.alert('Block Members', 'Member blocking will be implemented here');
    } else {
      Alert.alert('Access Denied', 'Only group leaders can block members');
    }
  };

  const handleTransferOwnership = () => {
    onClose();
    if (isLeader) {
      Alert.alert(
        'Transfer Group Ownership',
        'Are you sure you want to transfer ownership of this group? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Transfer', style: 'destructive', onPress: () => {
            Alert.alert('Transfer Ownership', 'Ownership transfer will be implemented here');
          }}
        ]
      );
    } else {
      Alert.alert('Access Denied', 'Only group leaders can transfer ownership');
    }
  };

  const handleRemoveFromActivityPage = () => {
    onClose();
    Alert.alert(
      'Remove From Activity Page',
      'Are you sure you want to remove this group from your activity page?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          Alert.alert('Removed', 'Group removed from activity page');
        }}
      ]
    );
  };

  const handleDeleteGroup = () => {
    onClose();
    if (isLeader) {
      Alert.alert(
        'Delete Group',
        'Are you sure you want to delete this group? This action cannot be undone and all group data will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const result = await groupService.deleteGroup(group.id, user.id);
              
              if (result.success) {
                Alert.alert(
                  'Group Deleted',
                  result.message,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate back to groups list
                        navigation.navigate('Groups');
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group. Please try again.');
            }
          }}
        ]
      );
    } else {
      Alert.alert('Access Denied', 'Only group leaders can delete the group');
    }
  };

  const handleEditCoverPhoto = () => {
    if (!isLeader) {
      Alert.alert('Access Denied', 'Only group leaders can edit the cover photo');
      return;
    }

    Alert.alert(
      'Edit Cover Photo',
      'Choose how you want to update your group cover photo',
      [
        {
          text: 'Upload from Library',
          onPress: handleUploadCoverPhoto
        },
        {
          text: 'Generate with AI',
          onPress: handleGenerateAICoverPhoto
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleUploadCoverPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a cover photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        await updateGroupCoverPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Could not access photo library. Please try again.');
    }
  };

  const handleGenerateAICoverPhoto = () => {
    setShowAiOptions(true);
  };

  const handleGenerateAI = async () => {
    if (!customPrompt.trim()) {
      Alert.alert('Error', 'Please describe what you want in your cover photo to generate an AI image');
      return;
    }

    setAiGenerating(true);
    
    try {
      console.log('🎨 Generating AI cover photo for group...');
      const result = await aiImageService.generateCoverPhoto(
        group.name || '',
        group.sport || '',
        group.group_type || 'group',
        aiStyle,
        customPrompt.trim()
      );

      if (result.success) {
        console.log('🎨 AI Generation Success! Image URL:', result.imageUrl);
        console.log('🎨 URL Length:', result.imageUrl?.length);
        console.log('🎨 URL Type:', typeof result.imageUrl);
        setShowAiOptions(false);
        await updateGroupCoverPhotoFromUrl(result.imageUrl);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate AI cover photo. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI cover photo:', error);
      Alert.alert('Error', 'Failed to generate AI cover photo. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const updateGroupCoverPhotoFromUrl = async (imageUrl) => {
    try {
      console.log('🔄 Processing AI-generated cover photo:', imageUrl);
      console.log('🔄 Group ID:', group.id);
      Alert.alert('Uploading...', 'Downloading and uploading your AI cover photo to storage...');
      
      // Download the AI-generated image and upload to Supabase Storage
      const uploadResult = await imageUploadService.uploadAIGeneratedCover(imageUrl, group.id);
      
      if (!uploadResult.success) {
        Alert.alert('Error', uploadResult.error || 'Failed to upload AI-generated image. Please try again.');
        return;
      }
      
      console.log('✅ AI image uploaded to Supabase:', uploadResult.url);
      
      // Update the group in the database with the Supabase URL
      const updateResult = await groupService.updateGroup(group.id, {
        cover_photo_url: uploadResult.url
      });
      
      console.log('🔄 Database update result:', updateResult);

      if (updateResult.success) {
        // Call the update callback if provided
        if (onGroupUpdate) {
          onGroupUpdate(updateResult.data);
        }
        
        Alert.alert(
          'Success!',
          'AI cover photo updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to update group. Please try again.');
      }
    } catch (error) {
      console.error('Error updating cover photo from URL:', error);
      Alert.alert('Error', 'Failed to update cover photo. Please try again.');
    }
  };

  const updateGroupCoverPhoto = async (imageUri) => {
    try {
      Alert.alert('Uploading...', 'Please wait while we update your cover photo.');
      
      // Upload the image
      const uploadResult = await imageUploadService.uploadGroupCover(
        imageUri,
        `${group.id}-${Date.now()}`
      );

      if (uploadResult.success) {
        // Update the group in the database
        const updateResult = await groupService.updateGroup(group.id, {
          cover_photo_url: uploadResult.url
        });

        if (updateResult.success) {
          // Call the update callback if provided
          if (onGroupUpdate) {
            onGroupUpdate(updateResult.data);
          }
          
          Alert.alert(
            'Success!',
            'Cover photo updated successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  onClose();
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to update group. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Error updating cover photo:', error);
      Alert.alert('Error', 'Failed to update cover photo. Please try again.');
    }
  };

  const handleLeaveGroup = () => {
    const groupType = group.group_type === 'team' ? 'team' : 'group';
    
    Alert.alert(
      `Leave ${groupType.charAt(0).toUpperCase() + groupType.slice(1)}`,
      `Are you sure you want to leave this ${groupType}? You'll need to be re-invited to rejoin.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Leaving group:', group.id, 'User:', user.id);
              
              const result = await groupService.leaveGroup(group.id, user.id);
              
              if (result.success) {
                Alert.alert(
                  'Left Successfully',
                  `You have left the ${groupType}.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        onClose();
                        // Navigate back to groups list
                        if (navigation) {
                          navigation.navigate('Groups');
                        }
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error || `Failed to leave ${groupType}. Please try again.`);
              }
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', `Failed to leave ${groupType}. Please try again.`);
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'image-outline',
      title: 'Edit Cover Photo',
      onPress: handleEditCoverPhoto,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'clipboard-outline',
      title: 'Create Registration',
      onPress: handleCreateRegistration,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'list-outline',
      title: 'View Registrations',
      onPress: handleViewRegistrations,
      showForAll: true
    },
    {
      icon: 'person-add-outline',
      title: 'Invite Friends',
      onPress: handleInviteFriends,
      showForAll: true
    },
    {
      icon: 'notifications-outline',
      title: 'Adjust Notifications',
      onPress: handleAdjustNotifications,
      showForAll: true
    },
    {
      icon: 'document-text-outline',
      title: 'View Reports',
      onPress: handleViewReports,
      showForAll: true
    },
    {
      icon: 'eye-outline',
      title: 'Group Privacy',
      onPress: handleGroupPrivacy,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'settings-outline',
      title: 'Group Settings',
      onPress: handleGroupSettings,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'grid-outline',
      title: 'Manage Tabs',
      onPress: handleManageTabs,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'people-outline',
      title: 'Edit Hosts',
      onPress: handleEditHosts,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'person-remove-outline',
      title: 'Remove Members',
      onPress: handleRemoveMembers,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'ban-outline',
      title: 'Block Members',
      onPress: handleBlockMembers,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'swap-horizontal-outline',
      title: 'Transfer Group Ownership',
      onPress: handleTransferOwnership,
      showForAll: false,
      leaderOnly: true
    },
    {
      icon: 'remove-circle-outline',
      title: 'Remove From Activity Page',
      onPress: handleRemoveFromActivityPage,
      showForAll: true
    },
    {
      icon: 'exit-outline',
      title: `Leave this ${group.group_type === 'team' ? 'Team' : 'Group'}`,
      onPress: handleLeaveGroup,
      showForAll: false,
      memberOnly: true,
      destructive: true
    },
    {
      icon: 'trash-outline',
      title: 'Delete this Group',
      onPress: handleDeleteGroup,
      showForAll: false,
      leaderOnly: true,
      destructive: true
    }
  ];

  const visibleItems = menuItems.filter(item => 
    item.showForAll || 
    (item.leaderOnly && isLeader) || 
    (item.memberOnly && !isLeader)
  );

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.menuItem, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
      onPress={item.onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={item.destructive ? '#FF3B30' : theme.colors.text} 
        />
        <Text style={[
          styles.menuItemText,
          { color: theme.colors.text },
          item.destructive && styles.destructiveText
        ]}>
          {item.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>More Options</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.menuContainer}>
            {visibleItems.map((item, index) => renderMenuItem(item, index))}
          </View>
        </ScrollView>

        {/* AI Style Selection Modal */}
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
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginRight: 34, // Compensate for back button width
  },
  headerSpacer: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  // AI Modal Styles
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
});

export default GroupOptionsModal;
