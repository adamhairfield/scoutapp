import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { groupService } from '../services/database';

const GroupOptionsModal = ({ visible, onClose, group, user, navigation }) => {
  const isLeader = group.leader_id === user.id;

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

  const menuItems = [
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
      icon: 'trash-outline',
      title: 'Delete this Group',
      onPress: handleDeleteGroup,
      showForAll: false,
      leaderOnly: true,
      destructive: true
    }
  ];

  const visibleItems = menuItems.filter(item => 
    item.showForAll || (item.leaderOnly && isLeader)
  );

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItem}
      onPress={item.onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={item.destructive ? '#FF3B30' : '#333'} 
        />
        <Text style={[
          styles.menuItemText,
          item.destructive && styles.destructiveText
        ]}>
          {item.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>More Options</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.menuContainer}>
            {visibleItems.map((item, index) => renderMenuItem(item, index))}
          </View>
        </ScrollView>
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
  menuContainer: {
    paddingTop: 20,
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
});

export default GroupOptionsModal;
