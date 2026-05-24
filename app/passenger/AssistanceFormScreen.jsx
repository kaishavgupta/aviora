import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, ProgressBar, Card, HelperText, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store, Constants, and Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { saveRequestDraft } from '../../services/requestService';
import { ASSISTANCE_TYPES } from '../../constants/assistanceTypes';

/**
 * AssistanceFormScreen component.
 * Represents Step 2 of the request creation flow.
 * Captures passenger name, contact email/mobile, assistance type, and special requirements.
 * Features collapsible trip details summary and character counters.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} AssistanceFormScreen layout.
 */
export default function AssistanceFormScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile } = useAuthStore();
  const { draftForm, mergeDraftForm } = useRequestStore();

  // Form Fields
  const [passengerName, setPassengerName] = useState('');
  const [passengerMobile, setPassengerMobile] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [assistanceType, setAssistanceType] = useState(null);
  const [specialRequirements, setSpecialRequirements] = useState('');

  // Touched Fields for validation triggers
  const [nameTouched, setNameTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [assistanceTouched, setAssistanceTouched] = useState(false);

  // Collapsible trip details state
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Load existing draft/profile values
  useEffect(() => {
    const loadFields = () => {
      // Prioritize existing draft details, fall back to initial profile details
      if (draftForm) {
        setPassengerName(draftForm.passengerName || userProfile?.name || '');
        setPassengerMobile(draftForm.passengerMobile || userProfile?.mobile || '');
        setPassengerEmail(draftForm.passengerEmail || userProfile?.email || '');
        if (draftForm.assistanceType) setAssistanceType(draftForm.assistanceType);
        if (draftForm.specialRequirements) setSpecialRequirements(draftForm.specialRequirements);
      } else if (userProfile) {
        setPassengerName(userProfile.name || '');
        setPassengerMobile(userProfile.mobile || '');
        setPassengerEmail(userProfile.email || '');
      }
    };
    loadFields();
  }, [draftForm, userProfile]);

  // Form validations
  const isNameValid = passengerName.trim().length >= 2;
  const isMobileValid = /^[6-9]\d{9}$/.test(passengerMobile.trim()); // Indian mobile format
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail.trim());
  const isAssistanceSelected = !!assistanceType;

  const isFormValid = isNameValid && isMobileValid && isEmailValid && isAssistanceSelected;

  // Validation Error messages
  const nameError = nameTouched && !isNameValid ? 'Full name must be at least 2 characters.' : '';
  const mobileError = mobileTouched && !isMobileValid ? 'Enter a valid 10-digit mobile number starting with 6-9.' : '';
  const emailError = emailTouched && !isEmailValid ? 'Enter a valid email address.' : '';
  const assistanceError = assistanceTouched && !isAssistanceSelected ? 'You must select an assistance service.' : '';

  /**
   * Merges fields into draft object, saves locally, and transitions to step 3.
   */
  const handleContinue = async () => {
    if (!isFormValid) return;

    const data = {
      passengerName: passengerName.trim(),
      passengerMobile: passengerMobile.trim(),
      passengerEmail: passengerEmail.trim(),
      assistanceType,
      specialRequirements: specialRequirements.trim(),
    };

    try {
      mergeDraftForm(data);
      if (user?.uid) {
        await saveRequestDraft(user.uid, {
          ...draftForm,
          ...data,
        });
      }
      navigation.navigate('UploadDocuments');
    } catch (err) {
      console.error('Error continuing from AssistanceForm:', err);
    }
  };

  // Format draft trip date for the summary box
  const formatTripDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardContainer, { backgroundColor: theme.colors.background }]}
    >
      {/* Progress Bar (Step 2 of 3) */}
      <ProgressBar progress={0.66} color={theme.colors.primary} style={styles.progressBar} />

      <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text variant="titleMedium" style={[styles.stepText, { color: theme.colors.subtext, fontWeight: '700' }]}>
            STEP 2 OF 3
          </Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            Passenger & Service Details
          </Text>
        </View>

        {/* Passenger Name */}
        <TextInput
          label="Passenger Name*"
          value={passengerName}
          onChangeText={(text) => {
            setPassengerName(text);
            if (nameError) setNameTouched(false);
          }}
          onBlur={() => setNameTouched(true)}
          mode="outlined"
          error={!!nameError}
          left={<TextInput.Icon icon="account-outline" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!nameError}>
          {nameError}
        </HelperText>

        {/* Mobile Number */}
        <TextInput
          label="Mobile Number*"
          value={passengerMobile}
          onChangeText={(text) => {
            const sanitized = text.replace(/[^0-9]/g, '');
            setPassengerMobile(sanitized.slice(0, 10));
            if (mobileError) setMobileTouched(false);
          }}
          onBlur={() => setMobileTouched(true)}
          keyboardType="phone-pad"
          maxLength={10}
          mode="outlined"
          error={!!mobileError}
          left={<TextInput.Icon icon="phone-outline" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!mobileError}>
          {mobileError}
        </HelperText>

        {/* Email Address */}
        <TextInput
          label="Email Address*"
          value={passengerEmail}
          onChangeText={(text) => {
            setPassengerEmail(text);
            if (emailError) setEmailTouched(false);
          }}
          onBlur={() => setEmailTouched(true)}
          keyboardType="email-address"
          autoCapitalize="none"
          mode="outlined"
          error={!!emailError}
          left={<TextInput.Icon icon="email-outline" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!emailError}>
          {emailError}
        </HelperText>

        {/* Assistance Grid Selection */}
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: theme.colors.subtext, fontWeight: '700' }]}>
          Select Assistance Type*
        </Text>
        <View style={styles.gridContainer}>
          {ASSISTANCE_TYPES.map((type) => {
            const isSelected = assistanceType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.gridItem,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                    backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.surface,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  setAssistanceType(type.id);
                  setAssistanceTouched(true);
                }}
              >
                <MaterialCommunityIcons
                  name={type.icon}
                  size={26}
                  color={isSelected ? theme.colors.primary : theme.colors.placeholder}
                />
                <Text
                  variant="labelSmall"
                  style={[
                    styles.gridItemLabel,
                    { 
                      color: isSelected ? theme.colors.primary : theme.colors.text,
                      fontWeight: isSelected ? 'bold' : 'normal',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <HelperText type="error" visible={!!assistanceError}>
          {assistanceError}
        </HelperText>

        {/* Special Requirements Multiline Input */}
        <View style={styles.requirementsHeader}>
          <Text variant="labelLarge" style={[styles.fieldLabel, { color: theme.colors.subtext, fontWeight: '700', marginTop: 0 }]}>
            Special Requirements Notes (Optional)
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.subtext }}>
            {specialRequirements.length}/500
          </Text>
        </View>
        <TextInput
          value={specialRequirements}
          onChangeText={(text) => setSpecialRequirements(text.slice(0, 500))}
          placeholder="e.g. Need assistance with baggage drop and boarding gate guiding. Requires aisle chair."
          multiline
          numberOfLines={4}
          mode="outlined"
          style={styles.multilineInput}
        />

        {/* Collapsible Trip Summary Verification Box */}
        {draftForm && (
          <Card style={styles.summaryCard} mode="outlined">
            <TouchableOpacity
              onPress={() => setSummaryExpanded(!summaryExpanded)}
              style={styles.summaryHeaderRow}
            >
              <View style={styles.summaryTitleWrapper}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={theme.colors.primary} />
                <Text variant="labelLarge" style={[styles.summaryTitle, { color: theme.colors.primary }]}>
                  Verify Trip Details
                </Text>
              </View>
              <MaterialCommunityIcons
                name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.placeholder}
              />
            </TouchableOpacity>

            {summaryExpanded && (
              <Card.Content style={styles.summaryExpandedContent}>
                <View style={styles.summaryRow}>
                  <Text variant="bodySmall" style={[styles.summaryKey, { color: theme.colors.subtext }]}>Airport:</Text>
                  <Text variant="bodySmall" style={[styles.summaryVal, { color: theme.colors.text }]}>{draftForm.airportName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="bodySmall" style={[styles.summaryKey, { color: theme.colors.subtext }]}>Flight / PNR:</Text>
                  <Text variant="bodySmall" style={[styles.summaryVal, { color: theme.colors.text }]}>
                    {draftForm.flightNumber} / {draftForm.pnrNumber}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="bodySmall" style={[styles.summaryKey, { color: theme.colors.subtext }]}>Date & Time:</Text>
                  <Text variant="bodySmall" style={[styles.summaryVal, { color: theme.colors.text }]}>
                    {formatTripDate(draftForm.travelDate)} ({draftForm.journeyType})
                  </Text>
                </View>
              </Card.Content>
            )}
          </Card>
        )}

        {/* Continue Action */}
        <Button
          mode="contained"
          onPress={handleContinue}
          disabled={!isFormValid}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continue to Upload
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 20,
  },
  stepText: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  title: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  input: {
    marginBottom: 1,
  },
  fieldLabel: {
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridItem: {
    width: '48%',
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  gridItemLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
  requirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  multilineInput: {
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  summaryExpandedContent: {
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryKey: {
    fontWeight: 'bold',
  },
  summaryVal: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 20,
  },
  button: {
    borderRadius: 8,
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
