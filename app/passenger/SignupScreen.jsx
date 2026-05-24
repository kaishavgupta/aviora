import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Card, TextInput, Button, Text, Chip, Snackbar, HelperText, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Service Imports
import { signupWithEmail, logout } from '../../services/authService';
import { useThemeStore } from '../../store/themeStore';

/**
 * SignupScreen component.
 * Allows users to register a new Passenger or Staff account.
 * Enforces rigid inline form validation (name, mobile, email, password rules)
 * before contacting Firebase Services.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} SignupScreen layout.
 */
export default function SignupScreen({ navigation }) {
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useThemeStore();

  // Form Field States
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('passenger'); // 'passenger' | 'staff'

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Inline Validation Error States
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  /**
   * Checks validity of all user inputs using regex and comparison logic.
   * Updates state variables for inline error helpers.
   * 
   * @returns {boolean} True if form is valid, false otherwise.
   */
  const validateForm = () => {
    let isValid = true;

    // Name Validation
    if (!name.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      isValid = false;
    } else {
      setNameError('');
    }

    // Mobile Validation (Exactly 10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobile.trim()) {
      setMobileError('Mobile number is required.');
      isValid = false;
    } else if (!mobileRegex.test(mobile.trim())) {
      setMobileError('Mobile number must be exactly 10 digits.');
      isValid = false;
    } else {
      setMobileError('');
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password Validation (min 6 chars, at least 1 number)
    const numberRegex = /\d/;
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    } else if (!numberRegex.test(password)) {
      setPasswordError('Password must contain at least one number.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Confirm Password Validation
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match.');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  /**
   * Handles user registration.
   * Performs validation, invokes authService, and handles success/failure states.
   */
  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signupWithEmail(
        email.trim(),
        password,
        name.trim(),
        mobile.trim(),
        role
      );

      // Sign out immediately after account creation so the user stays on the
      // Auth stack (Firebase auto-logs-in on createUser, which would swap to
      // PassengerNavigator before we can navigate to Login).
      await logout();
      navigation.navigate('Login', { signupSuccess: true });
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <View style={[styles.floatingToggle, { top: Platform.OS === 'ios' ? 50 : 40 }]}>
        <IconButton
          icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
          iconColor={theme.colors.primary}
          size={28}
          onPress={toggleTheme}
        />
      </View>
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.colors.background }]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="airplane"
            size={50}
            color={theme.colors.primary}
            style={styles.logoIcon}
          />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Create Account
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.placeholder }]}>
            Join Aviora for smooth airport transits
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            {/* Full Name Input */}
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError('');
              }}
              mode="outlined"
              error={!!nameError}
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
            />
            <HelperText type="error" visible={!!nameError}>
              {nameError}
            </HelperText>

            {/* Mobile Number Input */}
            <TextInput
              label="Mobile Number (10 digits)"
              value={mobile}
              onChangeText={(text) => {
                // Enforce numbers only and max length 10
                const numeric = text.replace(/[^0-9]/g, '');
                setMobile(numeric.slice(0, 10));
                if (mobileError) setMobileError('');
              }}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!mobileError}
              style={styles.input}
              left={<TextInput.Icon icon="phone-outline" />}
            />
            <HelperText type="error" visible={!!mobileError}>
              {mobileError}
            </HelperText>

            {/* Email Address Input */}
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!emailError}
              style={styles.input}
              left={<TextInput.Icon icon="email-outline" />}
            />
            <HelperText type="error" visible={!!emailError}>
              {emailError}
            </HelperText>

            {/* Password Input */}
            <TextInput
              label="Password (min 6 chars, 1 number)"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              error={!!passwordError}
              style={styles.input}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            <HelperText type="error" visible={!!passwordError}>
              {passwordError}
            </HelperText>

            {/* Confirm Password Input */}
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError('');
              }}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              error={!!confirmPasswordError}
              style={styles.input}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <HelperText type="error" visible={!!confirmPasswordError}>
              {confirmPasswordError}
            </HelperText>

            {/* Role Selection */}
            <Text variant="labelLarge" style={[styles.roleLabel, { color: theme.colors.placeholder }]}>
              Register my account as:
            </Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={role === 'passenger'}
                onPress={() => setRole('passenger')}
                style={[
                  styles.chip,
                  role === 'passenger' && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={{
                  color: role === 'passenger' ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: 'bold',
                }}
                showSelectedOverlay={false}
              >
                Passenger
              </Chip>
              <Chip
                selected={role === 'staff'}
                onPress={() => setRole('staff')}
                style={[
                  styles.chip,
                  role === 'staff' && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={{
                  color: role === 'staff' ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: 'bold',
                }}
                showSelectedOverlay={false}
              >
                Support Staff
              </Chip>
            </View>

            {/* Create Account Action Button */}
            <Button
              mode="contained"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {!loading && 'Create Account'}
            </Button>
          </Card.Content>
        </Card>

        {/* Redirect back to Login */}
        <View style={styles.loginRedirectContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onBackground }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text
              variant="bodyMedium"
              style={[styles.loginLink, { color: theme.colors.primary, fontWeight: 'bold' }]}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Notification Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4500}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarVisible(false),
          }}
          style={{ backgroundColor: theme.colors.error }}
        >
          {errorMessage}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  floatingToggle: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    transform: [{ rotate: '45deg' }],
    marginBottom: 6,
  },
  title: {
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  input: {
    marginBottom: 1,
  },
  roleLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chip: {
    flex: 0.48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  button: {
    borderRadius: 8,
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  loginRedirectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loginLink: {
    textDecorationLine: 'underline',
  },
});
