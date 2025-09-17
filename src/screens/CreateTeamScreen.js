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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { teamService } from '../services/database';

const CreateTeamScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState('basic');
  const [loading, setLoading] = useState(false);

  const subscriptionPlans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$9.99/month',
      features: ['Team roster management', 'Basic messaging', 'Schedule sharing'],
      color: '#4ECDC4',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19.99/month',
      features: ['Everything in Basic', 'Advanced analytics', 'Video sharing', 'Parent portal'],
      color: '#FF6B35',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$39.99/month',
      features: ['Everything in Pro', 'Live streaming', 'Custom branding', 'Priority support'],
      color: '#9B59B6',
    },
  ];

  const sports = [
    'Soccer', 'Basketball', 'Baseball', 'Football', 'Tennis', 
    'Swimming', 'Track & Field', 'Volleyball', 'Hockey', 'Other'
  ];

  const ageGroups = [
    'U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'
  ];

  const handleCreateTeam = async () => {
    if (!teamName || !sport || !ageGroup) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Create team in database
      const teamData = {
        name: teamName,
        sport: sport,
        coach_id: user.id,
        description: description,
        season: `${ageGroup} ${new Date().getFullYear()}`,
      };

      const result = await teamService.createTeam(teamData);

      if (result.success) {
        Alert.alert(
          'Success!', 
          `Team "${teamName}" has been created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SubscriptionCard = ({ plan, isSelected, onSelect }) => (
    <TouchableOpacity
      style={[
        styles.subscriptionCard,
        isSelected && { borderColor: plan.color, borderWidth: 2 },
      ]}
      onPress={onSelect}
    >
      <View style={styles.subscriptionHeader}>
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <Text style={styles.planPrice}>{plan.price}</Text>
      </View>
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={plan.color} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: plan.color }]}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Team</Text>
          </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Team Name *</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Enter team name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sport *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {sports.map((sportOption) => (
                  <TouchableOpacity
                    key={sportOption}
                    style={[
                      styles.chip,
                      sport === sportOption && styles.chipSelected,
                    ]}
                    onPress={() => setSport(sportOption)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        sport === sportOption && styles.chipTextSelected,
                      ]}
                    >
                      {sportOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age Group *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {ageGroups.map((age) => (
                  <TouchableOpacity
                    key={age}
                    style={[
                      styles.chip,
                      ageGroup === age && styles.chipSelected,
                    ]}
                    onPress={() => setAgeGroup(age)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        ageGroup === age && styles.chipTextSelected,
                      ]}
                    >
                      {age}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us about your team..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.subscriptionSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <Text style={styles.sectionSubtitle}>
              Select the subscription that best fits your team's needs
            </Text>
            
            {subscriptionPlans.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                isSelected={selectedSubscription === plan.id}
                onSelect={() => setSelectedSubscription(plan.id)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateTeam}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating Team...' : 'Create Team'}
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
    backgroundColor: '#f8f9fa',
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  chipSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  subscriptionSection: {
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateTeamScreen;
