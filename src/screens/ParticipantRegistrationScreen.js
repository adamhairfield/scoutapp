import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { registrationService } from '../services/registrationService';
import { supabase } from '../config/supabase';

const ParticipantRegistrationScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { registration, groupId } = route.params;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(true);
  const [participantFields, setParticipantFields] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [waivers, setWaivers] = useState([]);
  const [optionalItems, setOptionalItems] = useState([]);
  
  // Form responses
  const [responses, setResponses] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [waiverAcceptances, setWaiverAcceptances] = useState({});

  useEffect(() => {
    loadRegistrationFields();
  }, []);

  const loadRegistrationFields = async () => {
    try {
      console.log('🔍 Loading fields for registration ID:', registration.id);
      
      // Load participant fields
      const { data: pFields, error: pFieldsError } = await supabase
        .from('registration_participant_fields')
        .select('*')
        .eq('registration_id', registration.id)
        .order('order_index');
      
      if (pFieldsError) {
        console.error('❌ Error loading participant fields:', pFieldsError);
      }
      
      // Load custom fields
      const { data: cFields } = await supabase
        .from('registration_custom_fields')
        .select('*')
        .eq('registration_id', registration.id)
        .order('order_index');
      
      // Load custom forms
      const { data: forms } = await supabase
        .from('registration_forms')
        .select('*')
        .eq('registration_id', registration.id)
        .order('order_index');
      
      // Load form fields for all forms
      let formFieldsData = [];
      if (forms && forms.length > 0) {
        const formIds = forms.map(f => f.id);
        const { data: fields } = await supabase
          .from('registration_form_fields')
          .select('*')
          .in('form_id', formIds)
          .order('order_index');
        
        formFieldsData = fields || [];
        setFormFields(formFieldsData);
      }
      
      // Load waivers
      const { data: w } = await supabase
        .from('registration_waivers')
        .select('*')
        .eq('registration_id', registration.id)
        .order('order_index');
      
      // Load optional items
      const { data: items } = await supabase
        .from('registration_optional_items')
        .select('*')
        .eq('registration_id', registration.id)
        .eq('is_available', true)
        .order('order_index');

      setParticipantFields(pFields || []);
      setCustomFields(cFields || []);
      setCustomForms(forms || []);
      setWaivers(w || []);
      setOptionalItems(items || []);

      // Debug logging
      console.log('📋 Loaded registration fields:');
      console.log('  - Participant fields:', pFields?.length || 0);
      console.log('  - Custom fields:', cFields?.length || 0);
      console.log('  - Custom forms:', forms?.length || 0);
      console.log('  - Form fields:', formFieldsData?.length || 0);
      console.log('  - Waivers:', w?.length || 0);
      console.log('  - Optional items:', items?.length || 0);
    } catch (error) {
      console.error('Error loading registration fields:', error);
    }
  };

  const steps = [
    { title: 'Personal Info', subtitle: 'Your information' },
    ...(participantFields.length > 0 ? [{ title: 'Participant Details', subtitle: 'Additional info' }] : []),
    ...customForms.map(form => ({ title: form.name, subtitle: form.description || 'Form questions', formId: form.id })),
    ...(customFields.length > 0 ? [{ title: 'Custom Fields', subtitle: 'More details' }] : []),
    ...(optionalItems.length > 0 ? [{ title: 'Optional Items', subtitle: 'Add-ons' }] : []),
    ...(waivers.length > 0 ? [{ title: 'Waivers', subtitle: 'Review & accept' }] : []),
    { title: 'Review', subtitle: 'Confirm & submit' },
  ];

  const handleNext = () => {
    // Validation
    if (currentStep === 0) {
      if (!responses.firstName?.trim()) {
        Alert.alert('Required', 'Please enter your first name');
        return;
      }
      if (!responses.lastName?.trim()) {
        Alert.alert('Required', 'Please enter your last name');
        return;
      }
      if (!responses.email?.trim()) {
        Alert.alert('Required', 'Please enter your email');
        return;
      }
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

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Check required waivers
      const requiredWaivers = waivers.filter(w => w.is_required);
      for (const waiver of requiredWaivers) {
        if (!waiverAcceptances[waiver.id]) {
          Alert.alert('Required', `Please accept the ${waiver.name}`);
          setLoading(false);
          return;
        }
      }

      // Calculate total amount
      let totalAmount = parseFloat(registration.registration_fee) || 0;
      Object.keys(selectedItems).forEach(itemId => {
        const item = optionalItems.find(i => i.id === itemId);
        if (item && selectedItems[itemId] > 0) {
          totalAmount += parseFloat(item.price) * selectedItems[itemId];
        }
      });

      // Create submission
      const { data: submission, error: submissionError } = await supabase
        .from('registration_submissions')
        .insert([{
          registration_id: registration.id,
          user_id: user.id,
          total_amount: totalAmount,
          payment_status: totalAmount > 0 ? 'pending' : 'paid',
          status: 'pending',
        }])
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Save responses
      const responseData = [];
      
      // Personal info
      responseData.push({
        submission_id: submission.id,
        field_type: 'personal',
        response_value: {
          firstName: responses.firstName,
          lastName: responses.lastName,
          email: responses.email,
          phone: responses.phone,
        }
      });

      // Participant fields
      participantFields.forEach(field => {
        if (responses[field.id]) {
          responseData.push({
            submission_id: submission.id,
            field_id: field.id,
            field_type: 'participant_field',
            response_value: { value: responses[field.id] }
          });
        }
      });

      // Form fields (from custom forms)
      formFields.forEach(field => {
        if (responses[field.id]) {
          responseData.push({
            submission_id: submission.id,
            field_id: field.id,
            field_type: 'form_field',
            response_value: { value: responses[field.id] }
          });
        }
      });

      // Custom fields
      customFields.forEach(field => {
        if (responses[field.id]) {
          responseData.push({
            submission_id: submission.id,
            field_id: field.id,
            field_type: 'custom_field',
            response_value: { value: responses[field.id] }
          });
        }
      });

      if (responseData.length > 0) {
        await supabase
          .from('registration_submission_responses')
          .insert(responseData);
      }

      // Save waiver acceptances
      const waiverData = waivers
        .filter(w => waiverAcceptances[w.id])
        .map(w => ({
          submission_id: submission.id,
          waiver_id: w.id,
          signature_data: user.name,
          ip_address: null,
        }));

      if (waiverData.length > 0) {
        await supabase
          .from('registration_waiver_signatures')
          .insert(waiverData);
      }

      // Save optional item purchases
      const purchaseData = [];
      Object.keys(selectedItems).forEach(itemId => {
        const quantity = selectedItems[itemId];
        if (quantity > 0) {
          const item = optionalItems.find(i => i.id === itemId);
          if (item) {
            purchaseData.push({
              submission_id: submission.id,
              item_id: itemId,
              quantity: quantity,
              unit_price: parseFloat(item.price),
              total_price: parseFloat(item.price) * quantity,
            });
          }
        }
      });

      if (purchaseData.length > 0) {
        await supabase
          .from('registration_item_purchases')
          .insert(purchaseData);
      }

      setLoading(false);

      Alert.alert(
        'Success!',
        totalAmount > 0 
          ? `Registration submitted! Total: $${totalAmount.toFixed(2)}. Payment processing will be available soon.`
          : 'Registration submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('GroupRegistrations', { groupId })
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting registration:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
    }
  };

  const renderStepContent = () => {
    const stepIndex = currentStep;
    
    // Personal Info
    if (stepIndex === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Personal Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              First Name *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={responses.firstName || ''}
              onChangeText={(text) => setResponses({ ...responses, firstName: text })}
              placeholder="Enter first name"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Last Name *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={responses.lastName || ''}
              onChangeText={(text) => setResponses({ ...responses, lastName: text })}
              placeholder="Enter last name"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Email *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={responses.email || user.email || ''}
              onChangeText={(text) => setResponses({ ...responses, email: text })}
              placeholder="Enter email"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Phone Number
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={responses.phone || ''}
              onChangeText={(text) => setResponses({ ...responses, phone: text })}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      );
    }

    // Participant Fields
    let adjustedStep = stepIndex - 1;
    if (participantFields.length > 0 && adjustedStep === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Participant Details
          </Text>
          {participantFields.map(field => (
            <View key={field.id} style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                {field.field_label} {field.is_required && '*'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={responses[field.id] || ''}
                onChangeText={(text) => setResponses({ ...responses, [field.id]: text })}
                placeholder={`Enter ${field.field_label.toLowerCase()}`}
                placeholderTextColor={theme.colors.placeholder}
                keyboardType={field.field_type === 'number' ? 'numeric' : 'default'}
              />
            </View>
          ))}
        </View>
      );
    }

    // Adjust for participant fields
    if (participantFields.length > 0) adjustedStep--;

    // Custom Forms (each form gets its own step)
    if (customForms.length > 0) {
      for (let i = 0; i < customForms.length; i++) {
        if (adjustedStep === i) {
          const form = customForms[i];
          const fieldsForForm = formFields.filter(f => f.form_id === form.id);
          
          return (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                {form.name}
              </Text>
              {form.description && (
                <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
                  {form.description}
                </Text>
              )}
              {fieldsForForm.map(field => (
                <View key={field.id} style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                    {field.label} {field.is_required && '*'}
                  </Text>
                  {field.field_type === 'textarea' ? (
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={responses[field.id] || ''}
                      onChangeText={(text) => setResponses({ ...responses, [field.id]: text })}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={theme.colors.placeholder}
                      multiline
                      numberOfLines={4}
                    />
                  ) : field.field_type === 'select' && field.options ? (
                    <View>
                      {field.options.map((option, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.optionButton,
                            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            responses[field.id] === option && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` }
                          ]}
                          onPress={() => setResponses({ ...responses, [field.id]: option })}
                        >
                          <Text style={[styles.optionText, { color: theme.colors.text }]}>
                            {option}
                          </Text>
                          {responses[field.id] === option && (
                            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={responses[field.id] || ''}
                      onChangeText={(text) => setResponses({ ...responses, [field.id]: text })}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      placeholderTextColor={theme.colors.placeholder}
                      keyboardType={field.field_type === 'number' ? 'numeric' : field.field_type === 'email' ? 'email-address' : field.field_type === 'phone' ? 'phone-pad' : 'default'}
                    />
                  )}
                </View>
              ))}
            </View>
          );
        }
      }
      adjustedStep -= customForms.length;
    }

    // Custom Fields
    if (customFields.length > 0 && adjustedStep === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Additional Information
          </Text>
          {customFields.map(field => (
            <View key={field.id} style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                {field.label} {field.is_required && '*'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  field.field_type === 'textarea' && styles.textArea,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }
                ]}
                value={responses[field.id] || ''}
                onChangeText={(text) => setResponses({ ...responses, [field.id]: text })}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                placeholderTextColor={theme.colors.placeholder}
                multiline={field.field_type === 'textarea'}
                numberOfLines={field.field_type === 'textarea' ? 4 : 1}
              />
            </View>
          ))}
        </View>
      );
    }

    if (customFields.length > 0) adjustedStep--;

    // Optional Items
    if (optionalItems.length > 0 && adjustedStep === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Optional Items
          </Text>
          <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
            Add optional items to your registration
          </Text>
          {optionalItems.map(item => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.colors.text }]}>
                  {item.name}
                </Text>
                {item.description && (
                  <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>
                    {item.description}
                  </Text>
                )}
                <Text style={[styles.itemPrice, { color: theme.colors.primary }]}>
                  ${parseFloat(item.price).toFixed(2)}
                </Text>
              </View>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => {
                    const current = selectedItems[item.id] || 0;
                    if (current > 0) {
                      setSelectedItems({ ...selectedItems, [item.id]: current - 1 });
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.quantityText, { color: theme.colors.text }]}>
                  {selectedItems[item.id] || 0}
                </Text>
                <TouchableOpacity
                  style={[styles.quantityButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => {
                    const current = selectedItems[item.id] || 0;
                    const max = item.max_quantity || 10;
                    if (current < max) {
                      setSelectedItems({ ...selectedItems, [item.id]: current + 1 });
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (optionalItems.length > 0) adjustedStep--;

    // Waivers
    if (waivers.length > 0 && adjustedStep === 0) {
      return (
        <ScrollView style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Waivers & Agreements
          </Text>
          {waivers.map(waiver => (
            <View key={waiver.id} style={[styles.waiverCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.waiverName, { color: theme.colors.text }]}>
                {waiver.name} {waiver.is_required && '*'}
              </Text>
              <ScrollView style={styles.waiverContent} nestedScrollEnabled>
                <Text style={[styles.waiverText, { color: theme.colors.textSecondary }]}>
                  {waiver.content}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.waiverCheckbox}
                onPress={() => setWaiverAcceptances({ ...waiverAcceptances, [waiver.id]: !waiverAcceptances[waiver.id] })}
              >
                <Ionicons
                  name={waiverAcceptances[waiver.id] ? "checkbox" : "square-outline"}
                  size={24}
                  color={waiverAcceptances[waiver.id] ? theme.colors.primary : theme.colors.border}
                />
                <Text style={[styles.waiverCheckboxText, { color: theme.colors.text }]}>
                  I accept this {waiver.waiver_type || 'agreement'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      );
    }

    if (waivers.length > 0) adjustedStep--;

    // Review
    const totalFee = parseFloat(registration.registration_fee) || 0;
    const itemsTotal = Object.keys(selectedItems).reduce((sum, itemId) => {
      const item = optionalItems.find(i => i.id === itemId);
      const quantity = selectedItems[itemId] || 0;
      return sum + (item ? parseFloat(item.price) * quantity : 0);
    }, 0);
    const grandTotal = totalFee + itemsTotal;

    return (
      <ScrollView style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
          Review Your Registration
        </Text>

        <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Name</Text>
          <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
            {responses.firstName} {responses.lastName}
          </Text>
        </View>

        <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Email</Text>
          <Text style={[styles.reviewValue, { color: theme.colors.text }]}>
            {responses.email}
          </Text>
        </View>

        {Object.keys(selectedItems).filter(id => selectedItems[id] > 0).length > 0 && (
          <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.reviewLabel, { color: theme.colors.textSecondary }]}>Optional Items</Text>
            {Object.keys(selectedItems).map(itemId => {
              const quantity = selectedItems[itemId];
              if (quantity > 0) {
                const item = optionalItems.find(i => i.id === itemId);
                return (
                  <Text key={itemId} style={[styles.reviewValue, { color: theme.colors.text }]}>
                    {item.name} x{quantity} - ${(parseFloat(item.price) * quantity).toFixed(2)}
                  </Text>
                );
              }
              return null;
            })}
          </View>
        )}

        <View style={[styles.totalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Registration Fee</Text>
            <Text style={[styles.totalValue, { color: theme.colors.text }]}>${totalFee.toFixed(2)}</Text>
          </View>
          {itemsTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Optional Items</Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>${itemsTotal.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: theme.colors.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: theme.colors.primary }]}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

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

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: theme.colors.primary }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              loading && { opacity: 0.6 }
            ]}
            onPress={isLastStep ? handleSubmit : handleNext}
            disabled={loading}
          >
            {loading ? (
              <>
                <Ionicons name="hourglass-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.nextButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Submit Registration' : 'Next'}
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
    padding: 20,
  },
  stepContent: {
    flex: 1,
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
  inputGroup: {
    marginBottom: 20,
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  waiverCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  waiverName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  waiverContent: {
    maxHeight: 150,
    marginBottom: 12,
  },
  waiverText: {
    fontSize: 14,
    lineHeight: 20,
  },
  waiverCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  waiverCheckboxText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
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
  totalCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  grandTotalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextIcon: {
    marginLeft: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
});

export default ParticipantRegistrationScreen;
