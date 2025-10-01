import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrationService } from '../services/registrationService';

const RegistrationsTab = ({ group, navigation, theme }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRegistrations();
  }, [group.id]);

  const loadRegistrations = async () => {
    try {
      const result = await registrationService.getGroupRegistrations(group.id);
      if (result.success) {
        setRegistrations(result.data);
      }
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRegistrations();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading registrations...
        </Text>
      </View>
    );
  }

  if (registrations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={64} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No Registrations Yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Create your first registration to start accepting sign-ups
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {registrations.map((registration) => (
        <TouchableOpacity
          key={registration.id}
          style={[styles.registrationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('RegistrationDetails', { 
            registrationId: registration.id,
            groupId: group.id 
          })}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.typeIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
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
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    flex: 1,
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
});

export default RegistrationsTab;
