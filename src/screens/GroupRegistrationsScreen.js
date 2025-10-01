import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { registrationService } from '../services/registrationService';

const GroupRegistrationsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { groupId, group } = route.params;
  
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, [groupId]);

  const loadRegistrations = async () => {
    try {
      const result = await registrationService.getGroupRegistrations(groupId);
      if (result.success) {
        setRegistrations(result.data);
      } else {
        Alert.alert('Error', 'Failed to load registrations');
      }
    } catch (error) {
      console.error('Error loading registrations:', error);
      Alert.alert('Error', 'Failed to load registrations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRegistrations();
  };

  const handleDeleteRegistration = async (registration) => {
    Alert.alert(
      'Delete Registration',
      `Are you sure you want to delete "${registration.name}"? This action cannot be undone and all submissions will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await registrationService.deleteRegistration(registration.id);
              if (result.success) {
                Alert.alert('Success', 'Registration deleted successfully');
                loadRegistrations();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete registration');
              }
            } catch (error) {
              console.error('Error deleting registration:', error);
              Alert.alert('Error', 'Failed to delete registration');
            }
          }
        }
      ]
    );
  };

  const handleLongPress = (registration) => {
    if (registration.created_by === user.id) {
      setSelectedRegistration(registration);
      setShowOptionsModal(true);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'draft': return '#FF9500';
      case 'closed': return '#8E8E93';
      case 'cancelled': return '#FF3B30';
      default: return theme.colors.textSecondary;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'season': return 'calendar-outline';
      case 'clinic': return 'school-outline';
      case 'camp': return 'bonfire-outline';
      case 'event': return 'trophy-outline';
      case 'tournament': return 'medal-outline';
      default: return 'clipboard-outline';
    }
  };

  const renderRegistration = (registration) => (
    <TouchableOpacity
      key={registration.id}
      style={[styles.registrationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => navigation.navigate('RegistrationDetails', { 
        registrationId: registration.id,
        groupId: groupId 
      })}
      onLongPress={() => handleLongPress(registration)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeIconContainer}>
          <Ionicons 
            name={getTypeIcon(registration.registration_type)} 
            size={24} 
            color={theme.colors.primary} 
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.registrationName, { color: theme.colors.text }]}>
            {registration.name}
          </Text>
          <Text style={[styles.registrationType, { color: theme.colors.textSecondary }]}>
            {registration.registration_type.charAt(0).toUpperCase() + registration.registration_type.slice(1)} • {registration.sport}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(registration.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(registration.status) }]}>
            {registration.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {formatDate(registration.start_date)} - {formatDate(registration.end_date)}
          </Text>
        </View>

        {registration.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {registration.location}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.feeContainer}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
            <Text style={[styles.feeText, { color: theme.colors.text }]}>
              ${parseFloat(registration.registration_fee).toFixed(2)}
            </Text>
          </View>
          
          {registration.max_registrations && (
            <View style={styles.capacityContainer}>
              <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.capacityText, { color: theme.colors.textSecondary }]}>
                Max: {registration.max_registrations}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Registrations</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateRegistration', { group: { id: groupId, ...group } })}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading registrations...
            </Text>
          </View>
        ) : registrations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Registrations Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Create your first registration to start accepting sign-ups
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('CreateRegistration', { group: { id: groupId, ...group } })}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Registration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.registrationsList}>
            {registrations.map(renderRegistration)}
          </View>
        )}
      </ScrollView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedRegistration?.name}
            </Text>
            
            <TouchableOpacity
              style={[styles.optionButton, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowOptionsModal(false);
                // TODO: Navigate to edit screen
                Alert.alert('Coming Soon', 'Edit functionality will be available soon');
              }}
            >
              <Ionicons name="create-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.optionText, { color: theme.colors.text }]}>Edit Registration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowOptionsModal(false);
                if (selectedRegistration) {
                  handleDeleteRegistration(selectedRegistration);
                }
              }}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, { color: '#FF3B30' }]}>Delete Registration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Ionicons name="close-outline" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.optionText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registrationsList: {
    gap: 16,
  },
  registrationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  registrationName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  registrationType: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontSize: 14,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GroupRegistrationsScreen;
