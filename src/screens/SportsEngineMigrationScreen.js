import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import SportsEngineScrapingService from '../services/SportsEngineScrapingService';
import MigrationService from '../services/MigrationService';

// AsyncStorage keys
const STORAGE_KEYS = {
  CONNECTION_STATE: 'sportsengine_connection_state',
  MIGRATION_PREVIEW: 'sportsengine_migration_preview',
  SESSION_TOKEN: 'sportsengine_session_token',
  TASK_INFO: 'sportsengine_task_info',
};

const SportsEngineMigrationScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTaskInProgress, setIsTaskInProgress] = useState(false);
  const [taskUrl, setTaskUrl] = useState(null);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedOrganizations, setSelectedOrganizations] = useState({});
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);

  useEffect(() => {
    loadPersistedState();
  }, []);

  // Save state to AsyncStorage
  const saveConnectionState = async (connectionData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_STATE, JSON.stringify(connectionData));
    } catch (error) {
      console.error('Error saving connection state:', error);
    }
  };

  const saveMigrationPreview = async (previewData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MIGRATION_PREVIEW, JSON.stringify(previewData));
    } catch (error) {
      console.error('Error saving migration preview:', error);
    }
  };

  const saveSessionToken = async (token) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, token);
    } catch (error) {
      console.error('Error saving session token:', error);
    }
  };

  const saveTaskInfo = async (taskInfo) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TASK_INFO, JSON.stringify(taskInfo));
    } catch (error) {
      console.error('Error saving task info:', error);
    }
  };

  // Load state from AsyncStorage
  const loadPersistedState = async () => {
    try {
      // Load connection state
      const connectionState = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_STATE);
      if (connectionState) {
        const parsedState = JSON.parse(connectionState);
        setIsConnected(parsedState.isConnected);
        setIsTaskInProgress(parsedState.isTaskInProgress || false);
      }

      // Load migration preview
      const previewData = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATION_PREVIEW);
      if (previewData) {
        setMigrationPreview(JSON.parse(previewData));
      }

      // Load task info
      const taskInfo = await AsyncStorage.getItem(STORAGE_KEYS.TASK_INFO);
      if (taskInfo) {
        const parsedTaskInfo = JSON.parse(taskInfo);
        setTaskUrl(parsedTaskInfo.taskUrl);
      }

      // If connected, also check current status with backend
      const sessionToken = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      if (sessionToken) {
        checkConnectionStatus(sessionToken);
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
      // Fallback to checking connection status normally
      checkConnectionStatus();
    }
  };

  const checkConnectionStatus = async (existingToken = null) => {
    try {
      let connected = false;
      
      if (existingToken) {
        // Check if existing token is still valid
        connected = await SportsEngineScrapingService.isAuthenticated(existingToken);
      } else {
        connected = await SportsEngineScrapingService.isAuthenticated();
      }
      
      setIsConnected(connected);
      
      if (connected && !migrationPreview) {
        loadMigrationPreview();
      }

      // Save current connection state
      await saveConnectionState({ 
        isConnected: connected, 
        isTaskInProgress: isTaskInProgress 
      });
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  // Clear all persisted data
  const clearPersistedState = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CONNECTION_STATE,
        STORAGE_KEYS.MIGRATION_PREVIEW,
        STORAGE_KEYS.SESSION_TOKEN,
        STORAGE_KEYS.TASK_INFO,
      ]);
    } catch (error) {
      console.error('Error clearing persisted state:', error);
    }
  };

  const handleConnect = () => {
    setShowCredentialModal(true);
  };

  const handleCredentialSubmit = async () => {
    if (!credentials.email || !credentials.password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    setIsValidatingCredentials(true);
    try {
      const result = await SportsEngineScrapingService.authenticateWithCredentials(
        credentials.email, 
        credentials.password
      );
      
      if (result.success) {
        setIsConnected(true);
        setShowCredentialModal(false);
        setCredentials({ email: '', password: '' }); // Clear credentials
        
        // Save session token and connection state
        if (result.token) {
          await saveSessionToken(result.token);
        }
        
        if (result.taskUrl) {
          setTaskUrl(result.taskUrl);
          await saveTaskInfo({ taskUrl: result.taskUrl });
        }
        
        await saveConnectionState({ 
          isConnected: true, 
          isTaskInProgress: !!result.taskUrl 
        });
        
        Alert.alert(
          'Connected!', 
          'Successfully connected to SportsEngine. You can now preview and migrate your data.',
          [{ text: 'OK', onPress: loadMigrationPreview }]
        );
      } else {
        Alert.alert('Connection Failed', 'Invalid credentials or connection error.');
      }
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    } finally {
      setIsValidatingCredentials(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect SportsEngine',
      'Are you sure you want to disconnect from SportsEngine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await SportsEngineScrapingService.clearSession();
            
            // Clear all persistent state
            await clearPersistedState();
            
            // Reset all state variables
            setIsConnected(false);
            setMigrationPreview(null);
            setSelectedOrganizations({});
            setIsTaskInProgress(false);
            setTaskUrl(null);
            setMigrationProgress(null);
          }
        }
      ]
    );
  };

  const loadMigrationPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const preview = await SportsEngineScrapingService.getMigrationPreview();
      setMigrationPreview(preview);
      
      // Save migration preview to persistent storage
      await saveMigrationPreview(preview);
      
      // Check if we have a task in progress (Manus AI)
      const hasTaskInProgress = preview.organizations.some(org => 
        org.type === 'task' || org.taskInProgress || org.name.includes('Data Extraction')
      );
      
      if (hasTaskInProgress) {
        setIsTaskInProgress(true);
        const taskOrg = preview.organizations.find(org => org.type === 'task' || org.taskInProgress);
        if (taskOrg && taskOrg.url) {
          setTaskUrl(taskOrg.url);
          await saveTaskInfo({ taskUrl: taskOrg.url });
        }
      } else {
        setIsTaskInProgress(false);
        setTaskUrl(null);
        
        // Initialize all organizations as selected by default
        const initialSelection = {};
        preview.organizations.forEach(org => {
          initialSelection[org.id] = true;
        });
        setSelectedOrganizations(initialSelection);
      }

      // Update connection state with task progress info
      await saveConnectionState({ 
        isConnected: true, 
        isTaskInProgress: hasTaskInProgress 
      });
    } catch (error) {
      console.error('Error loading migration preview:', error);
      Alert.alert('Preview Error', 'Failed to load migration preview. Please try reconnecting.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleStartMigration = async () => {
    const selectedOrgIds = Object.keys(selectedOrganizations).filter(
      orgId => selectedOrganizations[orgId]
    );

    if (selectedOrgIds.length === 0) {
      Alert.alert('No Selection', 'Please select at least one organization to migrate.');
      return;
    }

    Alert.alert(
      'Start Migration',
      `This will migrate ${selectedOrgIds.length} organization(s) and their teams to Scout. This process may take a few minutes. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Migration',
          onPress: () => performMigration(selectedOrgIds)
        }
      ]
    );
  };

  const performMigration = async (selectedOrgIds) => {
    setIsMigrating(true);
    setMigrationProgress({ status: 'starting', message: 'Preparing migration...' });

    // Set up progress callback
    MigrationService.setProgressCallback(setMigrationProgress);

    try {
      const result = await MigrationService.startMigration(user.id, selectedOrgIds);
      
      if (result.success) {
        Alert.alert(
          'Migration Complete!',
          `Successfully migrated your SportsEngine data. ${result.data.groups.length} groups created with ${result.data.members.length} members.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Migration Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Migration Error', error.message);
    } finally {
      setIsMigrating(false);
      setMigrationProgress(null);
    }
  };

  const toggleOrganizationSelection = (orgId) => {
    setSelectedOrganizations(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const renderCredentialModal = () => (
    <Modal visible={showCredentialModal} animationType="slide" transparent>
      <View style={styles.credentialOverlay}>
        <View style={styles.credentialModal}>
          <Text style={styles.credentialTitle}>Connect to SportsEngine</Text>
          <Text style={styles.credentialSubtitle}>
            Enter your SportsEngine login credentials to import your data
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={credentials.email}
              onChangeText={(text) => setCredentials(prev => ({ ...prev, email: text }))}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={credentials.password}
              onChangeText={(text) => setCredentials(prev => ({ ...prev, password: text }))}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.credentialActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setShowCredentialModal(false);
                setCredentials({ email: '', password: '' });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleCredentialSubmit}
              disabled={isValidatingCredentials}
            >
              {isValidatingCredentials ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.securityNote}>
            🔒 Your credentials are used only to access your SportsEngine data and are not stored permanently.
          </Text>
        </View>
      </View>
    </Modal>
  );

  const renderConnectionSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons 
          name={isConnected ? (isTaskInProgress ? "time-outline" : "checkmark-circle") : "link-outline"} 
          size={24} 
          color={isConnected ? (isTaskInProgress ? "#f59e0b" : "#10b981") : "#667eea"} 
        />
        <Text style={styles.sectionTitle}>
          {isConnected 
            ? (isTaskInProgress ? 'Data Extraction in Progress' : 'Connected to SportsEngine')
            : 'Connect SportsEngine Account'
          }
        </Text>
      </View>
      
      <Text style={styles.sectionDescription}>
        {isConnected 
          ? (isTaskInProgress 
              ? 'Your SportsEngine account is connected. AI is currently extracting your team data. Please check back in a few minutes.'
              : 'Your SportsEngine account is connected and ready for migration.'
            )
          : 'Connect your SportsEngine account to import your teams, players, and data into Scout.'
        }
      </Text>

      {isConnected ? (
        <View style={styles.connectionActions}>
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
          
          {isTaskInProgress ? (
            <View style={styles.taskProgressContainer}>
              <ActivityIndicator color="#f59e0b" size="small" />
              <Text style={styles.taskProgressText}>Extracting data...</Text>
              {taskUrl && (
                <TouchableOpacity 
                  style={styles.taskUrlButton}
                  onPress={() => {
                    // Open task URL in browser or show in modal
                    Alert.alert(
                      'Task Progress',
                      'You can check the progress of your data extraction task.',
                      [
                        { text: 'OK', style: 'default' },
                        { text: 'Refresh', onPress: loadMigrationPreview }
                      ]
                    );
                  }}
                >
                  <Text style={styles.taskUrlButtonText}>Check Progress</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.previewButton} 
              onPress={() => setShowPreviewModal(true)}
              disabled={isLoadingPreview}
            >
              {isLoadingPreview ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.previewButtonText}>Preview Migration</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.connectButton} 
          onPress={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="link" size={20} color="#fff" />
              <Text style={styles.connectButtonText}>Connect SportsEngine</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMigrationSection = () => {
    if (!isConnected || !migrationPreview) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="download-outline" size={24} color="#667eea" />
          <Text style={styles.sectionTitle}>Migration Preview</Text>
        </View>
        
        <Text style={styles.sectionDescription}>
          Review and select the data you want to migrate to Scout.
        </Text>

        <View style={styles.previewStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{migrationPreview.organizations.length}</Text>
            <Text style={styles.statLabel}>Organizations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{migrationPreview.totalTeams}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{migrationPreview.totalPlayers}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{migrationPreview.totalStaff}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.migrateButton} 
          onPress={handleStartMigration}
          disabled={isMigrating}
        >
          {isMigrating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.migrateButtonText}>Start Migration</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMigrationProgress = () => {
    if (!migrationProgress) return null;

    return (
      <Modal visible={true} transparent animationType="fade">
        <View style={styles.progressOverlay}>
          <View style={styles.progressModal}>
            <Text style={styles.progressTitle}>Migrating Data</Text>
            <Text style={styles.progressMessage}>{migrationProgress.message}</Text>
            
            {migrationProgress.total > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {migrationProgress.current} / {migrationProgress.total}
                </Text>
              </View>
            )}
            
            <ActivityIndicator size="large" color="#667eea" style={styles.progressSpinner} />
          </View>
        </View>
      </Modal>
    );
  };

  const renderPreviewModal = () => {
    return (
      <Modal visible={showPreviewModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 15 }]}>
            <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Migration Preview</Text>
            <View style={{ width: 40 }} />
          </View>

        <ScrollView style={styles.modalContent}>
          {migrationPreview?.organizations.map(org => (
            <View key={org.id} style={styles.organizationCard}>
              <View style={styles.organizationHeader}>
                <Switch
                  value={selectedOrganizations[org.id] || false}
                  onValueChange={() => toggleOrganizationSelection(org.id)}
                  trackColor={{ false: '#e9ecef', true: '#667eea' }}
                  thumbColor={selectedOrganizations[org.id] ? '#fff' : '#f4f3f4'}
                />
                <View style={styles.organizationInfo}>
                  <Text style={styles.organizationName}>{org.name}</Text>
                  <Text style={styles.organizationDescription}>
                    {org.teams?.length || 0} team{(org.teams?.length || 0) !== 1 ? 's' : ''} • {org.sport || 'Multiple Sports'}
                  </Text>
                </View>
              </View>

              {org.teams?.map(team => (
                <View key={team.id} style={styles.teamCard}>
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamSport}>{team.sport}</Text>
                  </View>
                  
                  {/* Players Section */}
                  {team.players && team.players.length > 0 && (
                    <View style={styles.teamSection}>
                      <Text style={styles.sectionTitle}>Players ({team.players.length})</Text>
                      {team.players.slice(0, 3).map((player, index) => (
                        <View key={index} style={styles.playerRow}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <Text style={styles.playerDetails}>
                            {player.jerseyNumber} • {player.position}
                          </Text>
                        </View>
                      ))}
                      {team.players.length > 3 && (
                        <Text style={styles.moreText}>+{team.players.length - 3} more players</Text>
                      )}
                    </View>
                  )}

                  {/* Staff Section */}
                  {team.staff && team.staff.length > 0 && (
                    <View style={styles.teamSection}>
                      <Text style={styles.sectionTitle}>Staff ({team.staff.length})</Text>
                      {team.staff.map((staffMember, index) => (
                        <View key={index} style={styles.staffRow}>
                          <Text style={styles.staffName}>{staffMember.name}</Text>
                          <Text style={styles.staffRole}>{staffMember.role}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
        
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.startMigrationButton}
              onPress={() => {
                setShowPreviewModal(false);
                handleStartMigration();
              }}
            >
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.startMigrationButtonText}>Start Migration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

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
        <Text style={styles.headerTitle}>SportsEngine Migration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.heroSection}
        >
          <Ionicons name="swap-horizontal" size={48} color="#fff" />
          <Text style={styles.heroTitle}>Import from SportsEngine</Text>
          <Text style={styles.heroSubtitle}>
            Easily migrate your teams, players, and data from SportsEngine to Scout
          </Text>
        </LinearGradient>

        {renderConnectionSection()}
        {renderMigrationSection()}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What gets migrated?</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.infoText}>Organizations and teams</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.infoText}>Player rosters and jersey numbers</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.infoText}>Coaching staff and roles</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.infoText}>Team information and sports</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {renderMigrationProgress()}
      {renderPreviewModal()}
      {renderCredentialModal()}
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
    marginRight: 34,
  },
  headerSpacer: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  disconnectButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  previewButton: {
    flex: 2,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  migrateButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  migrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModal: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 280,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  progressMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  progressSpinner: {
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  organizationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  organizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  organizationInfo: {
    flex: 1,
    marginLeft: 15,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  organizationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  teamCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  teamDetails: {
    gap: 2,
  },
  teamDetail: {
    fontSize: 12,
    color: '#666',
  },
  // Credential Modal Styles
  credentialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  credentialModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  credentialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  credentialSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  credentialActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Task Progress Styles
  taskProgressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  taskProgressText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  taskUrlButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  taskUrlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Enhanced Modal Styles
  modalSafeArea: {
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamSport: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    backgroundColor: '#f0f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  teamSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  playerDetails: {
    fontSize: 12,
    color: '#666',
  },
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8f0',
    borderRadius: 6,
    marginBottom: 4,
  },
  staffName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  staffRole: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  startMigrationButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
  },
  startMigrationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SportsEngineMigrationScreen;
