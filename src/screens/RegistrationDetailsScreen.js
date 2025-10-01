import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { registrationService } from '../services/registrationService';

const RegistrationDetailsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { registrationId, groupId } = route.params;
  
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissionCount, setSubmissionCount] = useState(0);

  useEffect(() => {
    loadRegistration();
    loadSubmissionCount();
  }, [registrationId]);

  const loadRegistration = async () => {
    try {
      const result = await registrationService.getRegistration(registrationId);
      if (result.success) {
        setRegistration(result.data);
      } else {
        Alert.alert('Error', 'Failed to load registration details');
      }
    } catch (error) {
      console.error('Error loading registration:', error);
      Alert.alert('Error', 'Failed to load registration details');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionCount = async () => {
    try {
      const result = await registrationService.getSubmissionCount(registrationId);
      if (result.success) {
        setSubmissionCount(result.count);
      }
    } catch (error) {
      console.error('Error loading submission count:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
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

  const handleRegister = () => {
    navigation.navigate('ParticipantRegistration', { 
      registration, 
      groupId 
    });
  };

  const handleManageSubmissions = () => {
    navigation.navigate('ManageRegistrationSubmissions', {
      registration,
      groupId
    });
  };

  const isCreator = registration?.created_by === user.id;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!registration) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Registration not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const spotsRemaining = registration.max_registrations 
    ? registration.max_registrations - submissionCount 
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {registration.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(registration.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(registration.status) }]}>
            {registration.status.toUpperCase()}
          </Text>
        </View>

        {/* Registration Type & Sport */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="trophy-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {registration.registration_type.charAt(0).toUpperCase() + registration.registration_type.slice(1)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="basketball-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Sport:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {registration.sport}
            </Text>
          </View>
        </View>

        {/* Dates */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Dates</Text>
          <View style={styles.dateRange}>
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>Start</Text>
              <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                {formatDate(registration.start_date)}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textTertiary} />
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>End</Text>
              <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                {formatDate(registration.end_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        {registration.location && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Location</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={[styles.locationText, { color: theme.colors.text }]}>
                {registration.location}
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {registration.description && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
              {registration.description}
            </Text>
          </View>
        )}

        {/* Additional Details */}
        {registration.additional_details && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Additional Details</Text>
            <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
              {registration.additional_details}
            </Text>
          </View>
        )}

        {/* Registration Info */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Registration Info</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Fee:</Text>
            <Text style={[styles.feeValue, { color: theme.colors.text }]}>
              ${parseFloat(registration.registration_fee).toFixed(2)}
            </Text>
          </View>

          {registration.max_registrations && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Capacity:</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {registration.max_registrations} spots
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Registered:</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {submissionCount}
                </Text>
              </View>
              {spotsRemaining !== null && (
                <View style={styles.infoRow}>
                  <Ionicons name="hourglass-outline" size={20} color={spotsRemaining > 0 ? '#34C759' : '#FF3B30'} />
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Available:</Text>
                  <Text style={[styles.infoValue, { color: spotsRemaining > 0 ? '#34C759' : '#FF3B30' }]}>
                    {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Action Buttons */}
      {registration.status === 'active' && (
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {isCreator ? (
            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleManageSubmissions}
            >
              <Ionicons name="people-outline" size={20} color="#fff" />
              <Text style={styles.registerButtonText}>
                Manage Submissions ({submissionCount})
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: theme.colors.primary },
                spotsRemaining === 0 && { opacity: 0.5 }
              ]}
              onPress={handleRegister}
              disabled={spotsRemaining === 0}
            >
              <Ionicons name="clipboard-outline" size={20} color="#fff" />
              <Text style={styles.registerButtonText}>
                {spotsRemaining === 0 ? 'Registration Full' : 'Register Now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 40,
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
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default RegistrationDetailsScreen;
