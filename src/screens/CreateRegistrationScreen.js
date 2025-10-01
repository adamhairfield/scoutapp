import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { registrationService } from '../services/registrationService';

const CreateRegistrationScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { group } = route.params;
  
  // Onboarding step state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Registration data
  const [registrationType, setRegistrationType] = useState('');
  const [registrationName, setRegistrationName] = useState('');
  const [sport, setSport] = useState(group?.sport || '');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [maxRegistrations, setMaxRegistrations] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');
  
  // Form fields
  const [customForms, setCustomForms] = useState([]);
  const [participantFields, setParticipantFields] = useState([]);
  const [medicalWaivers, setMedicalWaivers] = useState([]);
  const [pdfAttachments, setPdfAttachments] = useState([]);
  const [optionalItems, setOptionalItems] = useState([]);
  const [customizations, setCustomizations] = useState([]);

  const registrationTypes = [
    { key: 'season', label: 'Season', icon: 'calendar-outline', desc: 'Full season registration' },
    { key: 'clinic', label: 'Clinic', icon: 'school-outline', desc: 'Skills clinic or training' },
    { key: 'camp', label: 'Camp', icon: 'bonfire-outline', desc: 'Sports camp or retreat' },
    { key: 'event', label: 'Event', icon: 'trophy-outline', desc: 'Single event or game' },
    { key: 'tournament', label: 'Tournament', icon: 'medal-outline', desc: 'Multi-day tournament' },
  ];

  const sports = [
    'Soccer', 'Basketball', 'Baseball', 'Football', 'Tennis',
    'Swimming', 'Track & Field', 'Volleyball', 'Hockey', 'Lacrosse',
    'Wrestling', 'Golf', 'Softball', 'Cross Country', 'Other'
  ];

  const steps = [
    { title: 'Type', subtitle: 'Choose registration type' },
    { title: 'Basic Info', subtitle: 'Name and sport' },
    { title: 'Dates', subtitle: 'Start and end dates' },
    { title: 'Location', subtitle: 'Where it takes place' },
    { title: 'Details', subtitle: 'Description and info' },
    { title: 'Capacity', subtitle: 'Max registrations' },
    { title: 'Pricing', subtitle: 'Registration fee' },
    { title: 'Forms', subtitle: 'Custom forms' },
    { title: 'Participant', subtitle: 'Participant info' },
    { title: 'Waivers', subtitle: 'Medical & legal' },
    { title: 'Attachments', subtitle: 'PDF documents' },
    { title: 'Optional', subtitle: 'Additional purchases' },
    { title: 'Custom', subtitle: 'Customizations' },
    { title: 'Review', subtitle: 'Review and create' },
  ];

  const handleNext = () => {
    // Validation for each step
    if (currentStep === 0 && !registrationType) {
      Alert.alert('Required', 'Please select a registration type');
      return;
    }
    if (currentStep === 1 && !registrationName.trim()) {
      Alert.alert('Required', 'Please enter a registration name');
      return;
    }
    if (currentStep === 1 && !sport) {
      Alert.alert('Required', 'Please select a sport');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCreateRegistration = async () => {
    try {
      setLoading(true);

      // Create the main registration
      const registrationData = {
        group_id: group.id,
        created_by: user.id,
        registration_type: registrationType,
        name: registrationName,
        sport: sport,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: location || null,
        description: description || null,
        additional_details: additionalDetails || null,
        max_registrations: maxRegistrations ? parseInt(maxRegistrations) : null,
        registration_fee: registrationFee ? parseFloat(registrationFee) : 0.00,
        status: 'active',
      };

      const result = await registrationService.createRegistration(registrationData);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create registration');
        setLoading(false);
        return;
      }

      const registrationId = result.data.id;

      // Add participant fields if any
      if (participantFields.length > 0) {
        console.log('📝 Adding participant fields:', participantFields);
        const fields = participantFields.map(key => {
          const fieldMap = {
            tshirt: { key: 'tshirt', label: 'T-Shirt Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
            roommate: { key: 'roommate', label: 'Roommate Preference', type: 'text' },
            jersey: { key: 'jersey', label: 'Jersey Number', type: 'number' },
            emergency: { key: 'emergency', label: 'Emergency Contact', type: 'text' },
            allergies: { key: 'allergies', label: 'Allergies/Dietary Restrictions', type: 'textarea' },
            experience: { key: 'experience', label: 'Experience Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
          };
          return fieldMap[key];
        });
        const fieldResult = await registrationService.addParticipantFields(registrationId, fields);
        console.log('✅ Participant fields result:', fieldResult.success ? 'Success' : fieldResult.error);
      }

      // Add custom forms if any
      if (customForms.length > 0) {
        await registrationService.addCustomForms(registrationId, customForms);
      }

      // Add waivers if any
      if (medicalWaivers.length > 0) {
        await registrationService.addWaivers(registrationId, medicalWaivers);
      }

      // Add optional items if any
      if (optionalItems.length > 0) {
        await registrationService.addOptionalItems(registrationId, optionalItems);
      }

      // Add custom fields if any
      if (customizations.length > 0) {
        await registrationService.addCustomFields(registrationId, customizations);
      }

      setLoading(false);
      
      Alert.alert(
        'Success!', 
        'Registration created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the registrations list for this group
              navigation.navigate('GroupRegistrations', { 
                groupId: group.id,
                registrationId: registrationId 
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating registration:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create registration. Please try again.');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              backgroundColor: theme.colors.primary 
            }
          ]} 
        />
      </View>
      <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
        Step {currentStep + 1} of {steps.length}
      </Text>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Registration Type
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              What type of registration is this?
            </Text>
            <View style={styles.typeGrid}>
              {registrationTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeCard,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border 
                    },
                    registrationType === type.key && {
                      borderColor: theme.colors.primary,
                      backgroundColor: `${theme.colors.primary}15`
                    }
                  ]}
                  onPress={() => setRegistrationType(type.key)}
                >
                  <View style={[
                    styles.typeIcon,
                    { backgroundColor: registrationType === type.key ? `${theme.colors.primary}20` : theme.colors.background }
                  ]}>
                    <Ionicons 
                      name={type.icon} 
                      size={32} 
                      color={registrationType === type.key ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                  </View>
                  <Text style={[styles.typeLabel, { color: theme.colors.text }]}>
                    {type.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: theme.colors.textSecondary }]}>
                    {type.desc}
                  </Text>
                  {registrationType === type.key && (
                    <View style={styles.typeSelected}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1: // Basic Info
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Basic Information
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Registration Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }
                ]}
                value={registrationName}
                onChangeText={setRegistrationName}
                placeholder="e.g., Spring 2025 Season, Summer Camp"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Sport *
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.sportScroll}
              >
                {sports.map((sportOption) => (
                  <TouchableOpacity
                    key={sportOption}
                    style={[
                      styles.sportChip,
                      { 
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border 
                      },
                      sport === sportOption && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary
                      }
                    ]}
                    onPress={() => setSport(sportOption)}
                  >
                    <Text style={[
                      styles.sportChipText,
                      { color: theme.colors.text },
                      sport === sportOption && { color: '#fff' }
                    ]}>
                      {sportOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        );

      case 2: // Dates
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Registration Dates
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Start Date *
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border 
                  }
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.dateText, { color: theme.colors.text }]}>
                  {formatDate(startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                End Date *
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border 
                  }
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.dateText, { color: theme.colors.text }]}>
                  {formatDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Start Date Picker Modal */}
            <Modal
              visible={showStartDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowStartDatePicker(false)}
            >
              <View style={styles.datePickerOverlay}>
                <View style={[styles.datePickerModal, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.datePickerHeader}>
                    <Text style={[styles.datePickerTitle, { color: theme.colors.text }]}>
                      Select Start Date
                    </Text>
                    <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Quick Date Selection */}
                  <View style={styles.quickDateButtons}>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => setStartDate(new Date())}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setStartDate(tomorrow);
                      }}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        setStartDate(nextWeek);
                      }}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>Next Week</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Month/Year Selector */}
                  <View style={styles.monthYearSelector}>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(startDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setStartDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.monthYearText, { color: theme.colors.text }]}>
                      {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(startDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setStartDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Day Selector */}
                  <View style={styles.daySelector}>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(startDate);
                        newDate.setDate(newDate.getDate() - 1);
                        setStartDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.dayText, { color: theme.colors.text }]}>
                      {startDate.getDate()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(startDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setStartDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.selectedDateDisplay, { color: theme.colors.textSecondary }]}>
                    Selected: {formatDate(startDate)}
                  </Text>

                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* End Date Picker Modal */}
            <Modal
              visible={showEndDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowEndDatePicker(false)}
            >
              <View style={styles.datePickerOverlay}>
                <View style={[styles.datePickerModal, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.datePickerHeader}>
                    <Text style={[styles.datePickerTitle, { color: theme.colors.text }]}>
                      Select End Date
                    </Text>
                    <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Quick Date Selection */}
                  <View style={styles.quickDateButtons}>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => {
                        const oneWeek = new Date(startDate);
                        oneWeek.setDate(oneWeek.getDate() + 7);
                        setEndDate(oneWeek);
                      }}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>1 Week</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => {
                        const oneMonth = new Date(startDate);
                        oneMonth.setMonth(oneMonth.getMonth() + 1);
                        setEndDate(oneMonth);
                      }}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>1 Month</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickDateButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                      onPress={() => {
                        const threeMonths = new Date(startDate);
                        threeMonths.setMonth(threeMonths.getMonth() + 3);
                        setEndDate(threeMonths);
                      }}
                    >
                      <Text style={[styles.quickDateText, { color: theme.colors.text }]}>3 Months</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Month/Year Selector */}
                  <View style={styles.monthYearSelector}>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(endDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setEndDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.monthYearText, { color: theme.colors.text }]}>
                      {endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(endDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setEndDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Day Selector */}
                  <View style={styles.daySelector}>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(endDate);
                        newDate.setDate(newDate.getDate() - 1);
                        setEndDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.dayText, { color: theme.colors.text }]}>
                      {endDate.getDate()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newDate = new Date(endDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setEndDate(newDate);
                      }}
                    >
                      <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.selectedDateDisplay, { color: theme.colors.textSecondary }]}>
                    Selected: {formatDate(endDate)}
                  </Text>

                  <TouchableOpacity
                    style={[styles.datePickerButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowEndDatePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 3: // Location
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Location
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Where will this take place?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }
                ]}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter venue name, address, or facility"
                placeholderTextColor={theme.colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 4: // Details
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Description & Details
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what participants can expect..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Additional Details
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }
                ]}
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
                placeholder="Any additional information participants should know..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 5: // Capacity
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Registration Capacity
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Maximum Number of Registrations
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }
                ]}
                value={maxRegistrations}
                onChangeText={setMaxRegistrations}
                placeholder="e.g., 50"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="number-pad"
              />
              <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                Leave blank for unlimited registrations
              </Text>
            </View>
          </View>
        );

      case 6: // Pricing
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Registration Fee
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Fee Amount
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.priceInput,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text 
                    }
                  ]}
                  value={registrationFee}
                  onChangeText={setRegistrationFee}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                Enter 0 for free registration
              </Text>
            </View>
          </View>
        );

      case 7: // Forms
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Custom Forms
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Add custom forms for participants to fill out
            </Text>
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('AddCustomForm', { 
                onAdd: (form) => setCustomForms([...customForms, form]) 
              })}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                Add Custom Form
              </Text>
            </TouchableOpacity>

            {customForms.map((form, index) => (
              <View 
                key={index} 
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{form.name}</Text>
                <TouchableOpacity onPress={() => {
                  setCustomForms(customForms.filter((_, i) => i !== index));
                }}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 8: // Participant Fields
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Participant Information
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Select what information to collect from participants
            </Text>
            
            {[
              { key: 'tshirt', label: 'T-Shirt Size', icon: 'shirt-outline' },
              { key: 'roommate', label: 'Roommate Preference', icon: 'people-outline' },
              { key: 'jersey', label: 'Jersey Number', icon: 'basketball-outline' },
              { key: 'emergency', label: 'Emergency Contact', icon: 'call-outline' },
              { key: 'allergies', label: 'Allergies/Dietary', icon: 'medical-outline' },
              { key: 'experience', label: 'Experience Level', icon: 'stats-chart-outline' },
            ].map((field) => (
              <TouchableOpacity
                key={field.key}
                style={[
                  styles.checkboxItem,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
                ]}
                onPress={() => {
                  if (participantFields.includes(field.key)) {
                    setParticipantFields(participantFields.filter(f => f !== field.key));
                  } else {
                    setParticipantFields([...participantFields, field.key]);
                  }
                }}
              >
                <View style={styles.checkboxLeft}>
                  <Ionicons name={field.icon} size={24} color={theme.colors.textSecondary} />
                  <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                    {field.label}
                  </Text>
                </View>
                <Ionicons 
                  name={participantFields.includes(field.key) ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={participantFields.includes(field.key) ? theme.colors.primary : theme.colors.border} 
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 9: // Waivers
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Medical Waivers & Forms
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Add required waivers and consent forms
            </Text>
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('AddWaiver', {
                onAdd: (waiver) => setMedicalWaivers([...medicalWaivers, waiver])
              })}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                Add Waiver/Form
              </Text>
            </TouchableOpacity>

            {medicalWaivers.map((waiver, index) => (
              <View 
                key={index} 
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{waiver.name}</Text>
                <TouchableOpacity onPress={() => {
                  setMedicalWaivers(medicalWaivers.filter((_, i) => i !== index));
                }}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 10: // PDF Attachments
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              PDF Attachments
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Attach documents like schedules, rules, or information packets
            </Text>
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.primary }]}
              onPress={() => {
                // TODO: Implement PDF picker
                Alert.alert('Coming Soon', 'PDF attachment functionality will be implemented');
              }}
            >
              <Ionicons name="document-attach-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                Attach PDF Document
              </Text>
            </TouchableOpacity>

            {pdfAttachments.map((pdf, index) => (
              <View 
                key={index} 
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.pdfInfo}>
                  <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                  <Text style={[styles.itemTitle, { color: theme.colors.text, marginLeft: 12 }]}>
                    {pdf.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setPdfAttachments(pdfAttachments.filter((_, i) => i !== index));
                }}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 11: // Optional Items
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Optional Purchase Items
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Add optional items participants can purchase during registration
            </Text>
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('AddOptionalItem', {
                onAdd: (item) => setOptionalItems([...optionalItems, item])
              })}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                Add Optional Item
              </Text>
            </TouchableOpacity>

            {optionalItems.map((item, index) => (
              <View 
                key={index} 
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemPrice, { color: theme.colors.textSecondary }]}>
                    ${item.price}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setOptionalItems(optionalItems.filter((_, i) => i !== index));
                }}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 12: // Customizations
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Custom Fields
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
              Add custom fields for additional information
            </Text>
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('AddCustomField', {
                onAdd: (field) => setCustomizations([...customizations, field])
              })}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
                Add Custom Field
              </Text>
            </TouchableOpacity>

            {customizations.map((custom, index) => (
              <View 
                key={index} 
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View>
                  <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{custom.label}</Text>
                  <Text style={[styles.itemType, { color: theme.colors.textSecondary }]}>
                    {custom.type}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setCustomizations(customizations.filter((_, i) => i !== index));
                }}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 13: // Review
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Review Registration
            </Text>
            
            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Type</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {registrationTypes.find(t => t.key === registrationType)?.label || 'Not set'}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Name</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {registrationName || 'Not set'}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Sport</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>{sport || 'Not set'}</Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Dates</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {formatDate(startDate)} - {formatDate(endDate)}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Location</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {location || 'Not set'}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Max Registrations</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {maxRegistrations || 'Unlimited'}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Fee</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                ${registrationFee || '0.00'}
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Forms</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {customForms.length} custom form(s)
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Participant Fields</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {participantFields.length} field(s)
              </Text>
            </View>

            <View style={[styles.reviewSection, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Waivers</Text>
              <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
                {medicalWaivers.length} waiver(s)
              </Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  const canSkip = currentStep >= 3 && currentStep <= 12;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {steps[currentStep].title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {steps[currentStep].subtitle}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {renderProgressBar()}

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {canSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              !canSkip && styles.nextButtonFull,
              loading && { opacity: 0.6 }
            ]}
            onPress={isLastStep ? handleCreateRegistration : handleNext}
            disabled={loading}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.nextButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Create Registration' : 'Next'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.nextIcon} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  typeGrid: {
    gap: 12,
  },
  typeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
    marginBottom: 12,
  },
  typeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDesc: {
    fontSize: 14,
  },
  typeSelected: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 6,
  },
  sportScroll: {
    marginTop: 8,
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  sportChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    marginTop: 4,
  },
  itemType: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  pdfInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  checkboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  reviewSection: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextIcon: {
    marginLeft: 4,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickDateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  monthYearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginBottom: 20,
  },
  dayText: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  selectedDateDisplay: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateRegistrationScreen;
