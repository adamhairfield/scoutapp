import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const handleSettingPress = (settingName) => {
    Alert.alert(settingName, `${settingName} functionality will be implemented soon!`);
  };

  const settingsItems = [
    {
      icon: 'mail-outline',
      title: 'Ask a Question',
      onPress: () => handleSettingPress('Ask a Question')
    },
    {
      icon: 'play-circle-outline',
      title: 'Watch Video Tutorial',
      onPress: () => handleSettingPress('Watch Video Tutorial')
    },
    {
      icon: 'information-circle-outline',
      title: 'Help Center',
      onPress: () => handleSettingPress('Help Center')
    },
    {
      icon: 'notifications-outline',
      title: 'Group Notifications',
      onPress: () => handleSettingPress('Group Notifications')
    },
    {
      icon: 'card-outline',
      title: 'Manage Payments',
      onPress: () => handleSettingPress('Manage Payments')
    },
    {
      icon: 'list-outline',
      title: 'View Lists',
      onPress: () => handleSettingPress('View Lists')
    },
    {
      icon: 'create-outline',
      title: 'Edit Profile',
      onPress: () => handleSettingPress('Edit Profile')
    },
    {
      icon: 'time-outline',
      title: 'Pending Posts',
      onPress: () => handleSettingPress('Pending Posts')
    },
    {
      icon: 'shield-outline',
      title: 'Profile Privacy',
      onPress: () => handleSettingPress('Profile Privacy')
    },
    {
      icon: 'business-outline',
      title: 'Create Organization Profile',
      onPress: () => handleSettingPress('Create Organization Profile')
    },
    {
      icon: 'swap-horizontal-outline',
      title: 'Switch Profiles',
      onPress: () => handleSettingPress('Switch Profiles')
    },
    {
      icon: 'document-text-outline',
      title: 'Terms & Conditions',
      onPress: () => handleSettingPress('Terms & Conditions'),
      isLast: true
    }
  ];

  const renderSettingItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.settingItem,
        item.isLast && styles.lastSettingItem
      ]}
      onPress={item.onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={item.icon} size={24} color="#333" />
        <Text style={styles.settingTitle}>{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsContainer}>
          {settingsItems.map((item, index) => renderSettingItem(item, index))}
        </View>
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
  settingsContainer: {
    backgroundColor: '#fff',
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
});

export default SettingsScreen;
