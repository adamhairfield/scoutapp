import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { registrationService } from '../services/registrationService';
import { supabase } from '../config/supabase';

const ManageRegistrationSubmissionsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { registration, groupId } = route.params;
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const result = await registrationService.getRegistrationSubmissions(registration.id);
      if (result.success) {
        setSubmissions(result.data);
      } else {
        Alert.alert('Error', 'Failed to load submissions');
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      Alert.alert('Error', 'Failed to load submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const handleApprove = async (submission) => {
    try {
      const { error } = await supabase
        .from('registration_submissions')
        .update({ status: 'approved' })
        .eq('id', submission.id);

      if (error) throw error;

      // If it's a season registration, add them to the group roster
      if (registration.registration_type === 'season') {
        // Add to roster table
        const { error: rosterError } = await supabase
          .from('roster')
          .upsert({
            group_id: groupId,
            player_id: submission.user_id,
            role: 'player',
            status: 'active',
            registration_id: registration.id,
            added_by: user.id,
            added_at: new Date().toISOString(),
          }, {
            onConflict: 'group_id,player_id'
          });

        if (rosterError) {
          console.error('Error adding to roster:', rosterError);
          Alert.alert('Warning', 'Registration approved but failed to add to roster. They may need to be added manually.');
        }

        // Also add to group_members so they can access the group
        const { error: memberError } = await supabase
          .from('group_members')
          .upsert({
            group_id: groupId,
            player_id: submission.user_id,
            joined_at: new Date().toISOString(),
          }, {
            onConflict: 'group_id,player_id'
          });

        if (memberError) {
          console.error('Error adding to group members:', memberError);
        }
      }

      Alert.alert('Success', 'Registration approved!');
      loadSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      Alert.alert('Error', 'Failed to approve registration');
    }
  };

  const handleDeny = async (submission) => {
    Alert.alert(
      'Deny Registration',
      'Are you sure you want to deny this registration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('registration_submissions')
                .update({ status: 'rejected' })
                .eq('id', submission.id);

              if (error) throw error;

              Alert.alert('Success', 'Registration denied');
              loadSubmissions();
            } catch (error) {
              console.error('Error denying submission:', error);
              Alert.alert('Error', 'Failed to deny registration');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#34C759';
      case 'pending': return '#FF9500';
      case 'rejected': return '#FF3B30';
      default: return theme.colors.textSecondary;
    }
  };

  const renderSubmission = (submission) => (
    <View
      key={submission.id}
      style={[styles.submissionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={styles.submissionHeader}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {submission.profiles?.name || 'Unknown User'}
          </Text>
          <Text style={[styles.submittedDate, { color: theme.colors.textSecondary }]}>
            Submitted {new Date(submission.submitted_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(submission.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(submission.status) }]}>
            {submission.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.submissionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Amount: ${parseFloat(submission.total_amount).toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            Payment: {submission.payment_status}
          </Text>
        </View>
      </View>

      {submission.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(submission)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={() => handleDeny(submission)}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      )}

      {submission.status === 'approved' && registration.registration_type === 'season' && (
        <View style={[styles.rosterBadge, { backgroundColor: '#34C75920' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={[styles.rosterText, { color: '#34C759' }]}>
            Added to roster
          </Text>
        </View>
      )}
    </View>
  );

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Manage Submissions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{submissions.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{approvedCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF3B30' }]}>{rejectedCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Rejected</Text>
        </View>
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
              Loading submissions...
            </Text>
          </View>
        ) : submissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Submissions Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Submissions will appear here once participants register
            </Text>
          </View>
        ) : (
          <View style={styles.submissionsList}>
            {submissions.map(renderSubmission)}
          </View>
        )}
      </ScrollView>
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
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  },
  submissionsList: {
    gap: 16,
  },
  submissionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  submittedDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  submissionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  denyButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rosterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  rosterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ManageRegistrationSubmissionsScreen;
