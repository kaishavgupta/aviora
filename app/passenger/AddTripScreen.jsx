import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, ProgressBar, SegmentedButtons, HelperText, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { saveRequestDraft } from '../../services/requestService';

/**
 * AddTripScreen component.
 * Represents Step 1 of the request creation flow.
 * Captures flight coordinates: Airport, Flight No, PNR, date/time, terminal.
 * Features draft persistence and sequential datetime pickers.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} AddTripScreen layout.
 */
export default function AddTripScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { draftForm, mergeDraftForm, loadDraft } = useRequestStore();

  // Form Fields
  const [airportName, setAirportName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnrNumber, setPnrNumber] = useState('');
  const [travelDate, setTravelDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Default: tomorrow
  const [journeyType, setJourneyType] = useState('Departure'); // Default: Departure
  const [terminalGate, setTerminalGate] = useState('');

  // Touched Fields for validation triggers
  const [airportTouched, setAirportTouched] = useState(false);
  const [flightTouched, setFlightTouched] = useState(false);
  const [pnrTouched, setPnrTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);

  // DateTimePicker dialog visibility states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load existing draft if present
  useEffect(() => {
    const initializeForm = async () => {
      if (!user?.uid) return;
      
      let currentDraft = draftForm;
      if (!currentDraft) {
        currentDraft = await loadDraft(user.uid);
      }

      if (currentDraft) {
        if (currentDraft.airportName) setAirportName(currentDraft.airportName);
        if (currentDraft.flightNumber) setFlightNumber(currentDraft.flightNumber);
        if (currentDraft.pnrNumber) setPnrNumber(currentDraft.pnrNumber);
        if (currentDraft.travelDate) setTravelDate(new Date(currentDraft.travelDate));
        if (currentDraft.journeyType) setJourneyType(currentDraft.journeyType);
        if (currentDraft.terminalGate) setTerminalGate(currentDraft.terminalGate);
      }
    };
    initializeForm();
  }, [user, draftForm, loadDraft]);

  // Form Validation checks
  const isAirportValid = airportName.trim().length >= 3;
  const isFlightValid = /^[A-Z0-9]{2,8}$/i.test(flightNumber.trim());
  const isPnrValid = /^[A-Z0-9]{6}$/i.test(pnrNumber.trim());
  const isDateValid = travelDate.getTime() > Date.now();

  const isFormValid = isAirportValid && isFlightValid && isPnrValid && isDateValid;

  // Validation Error messages
  const airportError = airportTouched && !isAirportValid ? 'Airport name must be at least 3 characters.' : '';
  const flightError = flightTouched && !isFlightValid ? 'Enter a valid flight number (e.g. AI202).' : '';
  const pnrError = pnrTouched && !isPnrValid ? 'PNR must be exactly 6 alphanumeric characters.' : '';
  const dateError = dateTouched && !isDateValid ? 'Travel date and time must be in the future.' : '';

  /**
   * Handles date picker selection change and schedules time picker.
   */
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    setDateTouched(true);
    if (selectedDate) {
      const updated = new Date(travelDate);
      updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setTravelDate(updated);
      
      // Auto open time picker after closing date picker
      setTimeout(() => {
        setShowTimePicker(true);
      }, 300);
    }
  };

  /**
   * Handles time picker selection changes.
   */
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const updated = new Date(travelDate);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setTravelDate(updated);
    }
  };

  /**
   * Integrates draft inputs and navigates to the next phase.
   */
  const handleContinue = async () => {
    if (!isFormValid) return;

    const data = {
      airportName: airportName.trim(),
      flightNumber: flightNumber.trim().toUpperCase(),
      pnrNumber: pnrNumber.trim().toUpperCase(),
      travelDate: travelDate.toISOString(),
      journeyType,
      terminalGate: terminalGate.trim(),
    };

    try {
      mergeDraftForm(data);
      if (user?.uid) {
        await saveRequestDraft(user.uid, {
          ...draftForm,
          ...data,
        });
      }
      navigation.navigate('AssistanceForm');
    } catch (err) {
      console.error('Error continuing from AddTrip:', err);
    }
  };

  const KeyboardContainer = Platform.OS === 'web' ? View : KeyboardAvoidingView;

  return (
    <KeyboardContainer
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.keyboardContainer, { backgroundColor: theme.colors.background }]}
    >
      {/* Progress Bar (Step 1 of 3) */}
      <ProgressBar progress={0.33} color={theme.colors.primary} style={styles.progressBar} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text variant="titleMedium" style={[styles.stepText, { color: theme.colors.subtext }]}> 
            STEP 1 OF 3
          </Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
            Flight & Booking Details
          </Text>
        </View>

        {/* Airport Name */}
        <TextInput
          label="Airport Name*"
          value={airportName}
          onChangeText={(text) => {
            setAirportName(text);
            if (airportError) setAirportTouched(false);
          }}
          onBlur={() => setAirportTouched(true)}
          placeholder="e.g. Indira Gandhi International"
          mode="outlined"
          error={!!airportError}
          left={<TextInput.Icon icon="map-marker-outline" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!airportError}>
          {airportError}
        </HelperText>

        {/* Flight Number */}
        <TextInput
          label="Flight Number*"
          value={flightNumber}
          onChangeText={(text) => {
            setFlightNumber(text);
            if (flightError) setFlightTouched(false);
          }}
          onBlur={() => setFlightTouched(true)}
          placeholder="e.g. AI202"
          autoCapitalize="characters"
          mode="outlined"
          error={!!flightError}
          left={<TextInput.Icon icon="airplane-takeoff" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!flightError}>
          {flightError}
        </HelperText>

        {/* PNR Number */}
        <TextInput
          label="PNR Number*"
          value={pnrNumber}
          onChangeText={(text) => {
            const sanitized = text.replace(/[^A-Za-z0-9]/g, '');
            setPnrNumber(sanitized.slice(0, 6));
            if (pnrError) setPnrTouched(false);
          }}
          onBlur={() => setPnrTouched(true)}
          placeholder="e.g. ABC123"
          autoCapitalize="characters"
          maxLength={6}
          mode="outlined"
          error={!!pnrError}
          left={<TextInput.Icon icon="ticket-confirmation-outline" />}
          style={styles.input}
        />
        <HelperText type="error" visible={!!pnrError}>
          {pnrError}
        </HelperText>

        {/* Travel Date & Time Selector */}
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: theme.colors.placeholder }]}>
          Travel Date & Time*
        </Text>
        <TouchableOpacity 
          style={[styles.dateTimeBox, { borderColor: dateError ? theme.colors.error : theme.colors.outline, backgroundColor: theme.colors.surface }]} 
          onPress={() => {
            if (Platform.OS === 'web') {
              const inputDate = window.prompt("Enter travel date (YYYY-MM-DD):", travelDate.toISOString().split('T')[0]);
              if (inputDate) {
                const updated = new Date(inputDate);
                if (!isNaN(updated.getTime())) {
                   const inputTime = window.prompt("Enter travel time (HH:MM 24-hour):", travelDate.toTimeString().slice(0,5));
                   if (inputTime) {
                     const [hours, minutes] = inputTime.split(':');
                     updated.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0);
                     setTravelDate(updated);
                     setDateTouched(true);
                   }
                }
              }
            } else {
              setShowDatePicker(true);
            }
          }}
        >
          <View style={styles.dateTimeTextRow}>
            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={[styles.dateTimeText, { color: theme.colors.subtext, fontWeight: '600' }]}>
              {travelDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.dateTimeTextRow}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={[styles.dateTimeText, { color: theme.colors.subtext, fontWeight: '600' }]}>
              {travelDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </TouchableOpacity>
        <HelperText type="error" visible={!!dateError}>
          {dateError}
        </HelperText>

        {/* Segmented Journey Type */}
        <Text variant="labelLarge" style={[styles.fieldLabel, { color: theme.colors.placeholder }]}>
          Journey Type*
        </Text>
        <SegmentedButtons
          value={journeyType}
          onValueChange={setJourneyType}
          buttons={[
            { value: 'Departure', label: 'Departure', icon: 'airplane-takeoff' },
            { value: 'Arrival', label: 'Arrival', icon: 'airplane-landing' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Optional Terminal / Gate info */}
        <TextInput
          label="Current Terminal / Gate (Optional)"
          value={terminalGate}
          onChangeText={setTerminalGate}
          placeholder="e.g. Terminal 3, Gate 14A"
          mode="outlined"
          left={<TextInput.Icon icon="door-open" />}
          style={styles.input}
        />

        {/* Continue Action */}
        <Button
          mode="contained"
          onPress={handleContinue}
          disabled={!isFormValid}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continue
        </Button>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS !== 'web' && DateTimePicker && (
        <DateTimePicker
          value={travelDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && Platform.OS !== 'web' && DateTimePicker && (
        <DateTimePicker
          value={travelDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </KeyboardContainer>
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
    marginTop: 10,
    marginBottom: 6,
  },
  dateTimeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateTimeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    marginTop: 24,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
