import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, ActivityIndicator, Snackbar, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createRequest } from '../../services/requestService';
import { useAuthStore } from '../../store/authStore';
import { ASSISTANCE_TYPES } from '../../constants/assistanceTypes';

export default function OnboardPassengerScreen({ navigation }) {
  const theme = useTheme();
  const { user, role } = useAuthStore();
  const [passengerName, setPassengerName] = useState('');
  const [passengerMobile, setPassengerMobile] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [airportName, setAirportName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnr, setPnr] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().slice(0, 16));
  const [assistanceType, setAssistanceType] = useState(ASSISTANCE_TYPES[0]?.id || '');
  const [flightType, setFlightType] = useState('DEPARTURE');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const isFormValid = passengerName.trim() && passengerMobile.trim() && airportName.trim() && flightNumber.trim();

  if (role !== 'admin') {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Admin Access Required
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>
          Only administrators can onboard passenger requests manually.
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!isFormValid) {
      setSnackbarMsg('Please fill passenger name, mobile, airport, and flight details.');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        passengerName: passengerName.trim(),
        passengerMobile: passengerMobile.trim(),
        passengerEmail: passengerEmail.trim(),
        airportName: airportName.trim(),
        flightNumber: flightNumber.trim().toUpperCase(),
        pnr: pnr.trim().toUpperCase(),
        travelDate: new Date(travelDate),
        assistanceType,
        flightType,
        specialRequirements: specialRequirements.trim() || null,
      };

      const requestId = await createRequest(
        requestData,
        user?.uid || 'admin_onboard',
        {
          name: passengerName.trim(),
          mobile: passengerMobile.trim(),
          email: passengerEmail.trim(),
        }
      );

      setSnackbarMsg(`Passenger request created: ${requestId.slice(0, 8).toUpperCase()}`);
      setSnackbarVisible(true);
      setTimeout(() => {
        navigation.navigate('RequestDetail', { requestId });
      }, 1200);
    } catch (err) {
      console.error('Error onboarding passenger request:', err);
      setSnackbarMsg(err.message || 'Could not onboard the passenger request.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Card style={styles.formCard} elevation={1}>
        <Card.Content>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="account-plus-outline" size={28} color={theme.colors.primary} />
            <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Onboard Passenger</Text>
          </View>

          <TextInput
            label="Passenger Name"
            value={passengerName}
            onChangeText={setPassengerName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Passenger Mobile"
            value={passengerMobile}
            onChangeText={(text) => setPassengerMobile(text.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Passenger Email"
            value={passengerEmail}
            onChangeText={setPassengerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Airport Name"
            value={airportName}
            onChangeText={setAirportName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Flight Number"
            value={flightNumber}
            onChangeText={(text) => setFlightNumber(text.toUpperCase())}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="PNR"
            value={pnr}
            onChangeText={(text) => setPnr(text.toUpperCase())}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Travel Date & Time"
            value={travelDate}
            onChangeText={setTravelDate}
            placeholder="YYYY-MM-DDTHH:MM"
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.radioSection}>
            <Text variant="labelLarge" style={styles.sectionLabel}>Assistance Type</Text>
            <RadioButton.Group onValueChange={setAssistanceType} value={assistanceType}>
              {ASSISTANCE_TYPES.map((type) => (
                <View key={type.id} style={styles.radioRow}>
                  <RadioButton value={type.id} color={theme.colors.primary} />
                  <Text style={styles.radioLabel}>{type.label}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </View>

          <TextInput
            label="Special Requirements"
            value={specialRequirements}
            onChangeText={setSpecialRequirements}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <Button
            mode="contained"
            icon="check-bold"
            loading={loading}
            disabled={loading}
            onPress={handleSubmit}
            style={styles.submitButton}
          >
            Create Assistance Request
          </Button>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMsg}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  formCard: {
    borderRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
  input: {
    marginBottom: 14,
  },
  radioSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: '700',
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 8,
    marginTop: 8,
  },
});
