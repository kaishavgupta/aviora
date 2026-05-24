import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Card, TextInput, Button, Text, Chip, Snackbar, HelperText, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Service & Store Imports
import { loginWithEmail } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

/**
 * LoginScreen component.
 * Allows passengers and staff/admin to log in.
 * Includes inline form validations, secure entry toggles, loading indicators, and Snackbar errors.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @param {Object} props.route - Navigation state and route params.
 * @returns {React.JSX.Element} LoginScreen layout.
 */
export default function LoginScreen({ navigation, route }) {
  const theme = useTheme();
  const setUser = useAuthStore((state) => state.setUser);
  const { toggleTheme, isDarkMode } = useThemeStore();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState('passenger'); // 'passenger' | 'staff'
  const [showPassword, setShowPassword] = useState(false);

  // Loading, success & error states
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Inline validation error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Check for successful signup redirect params
  useEffect(() => {
    if (route.params?.signupSuccess) {
      setIsSuccess(true);
      setErrorMessage('Account created successfully! Please sign in.');
      setSnackbarVisible(true);
      
      // Clear route parameters so the message doesn't keep appearing
      navigation.setParams({ signupSuccess: undefined });
    }
  }, [route.params, navigation]);

  /**
   * Validates email format and password length.
   * Sets appropriate inline error messages.
   * 
   * @returns {boolean} True if all fields are valid, false otherwise.
   */
  const validateForm = () => {
    let isValid = true;

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email address is required.');
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password Validation
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  /**
   * Submits credentials to Firebase Auth via authService.
   * Handles user/role state caching and navigation redirection.
   */
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setIsSuccess(false);
    try {
      const result = await loginWithEmail(email.trim(), password);
      
      // Strict Check: Validate that the database role matches user's selection
      if (roleSelection === 'staff' && result.role === 'passenger') {
        throw new Error('This account does not have Staff/Admin privileges. Please log in as a Passenger.');
      } else if (roleSelection === 'passenger' && (result.role === 'staff' || result.role === 'admin')) {
        throw new Error('This account is registered as Staff/Admin. Please select Staff/Admin role.');
      }

      // If valid, save to Zustand authStore (RootNavigator will auto-redirect)
      setUser(result.user, result.role, result.profile);
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred during login.');
      setIsSuccess(false);
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
            size={70}
            color={theme.colors.primary}
            style={styles.logoIcon}
          />
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
            AVIORA
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.placeholder }]}>
            Airport Passenger Assistance
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              Sign In
            </Text>

            {/* Email Input */}
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
              label="Password"
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

            {/* Role Selection */}
            <Text variant="labelLarge" style={[styles.roleLabel, { color: theme.colors.placeholder }]}>
              I want to log in as:
            </Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={roleSelection === 'passenger'}
                onPress={() => setRoleSelection('passenger')}
                style={[
                  styles.chip,
                  roleSelection === 'passenger' && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={{
                  color: roleSelection === 'passenger' ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: 'bold',
                }}
                showSelectedOverlay={false}
              >
                Passenger
              </Chip>
              <Chip
                selected={roleSelection === 'staff'}
                onPress={() => setRoleSelection('staff')}
                style={[
                  styles.chip,
                  roleSelection === 'staff' && { backgroundColor: theme.colors.primary },
                ]}
                textStyle={{
                  color: roleSelection === 'staff' ? theme.colors.onPrimary : theme.colors.onSurface,
                  fontWeight: 'bold',
                }}
                showSelectedOverlay={false}
              >
                Staff / Admin
              </Chip>
            </View>

            {/* Login Action Button */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {!loading && 'Login'}
            </Button>
          </Card.Content>
        </Card>

        {/* Signup Redirect Link */}
        <View style={styles.signupContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onBackground }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text
              variant="bodyMedium"
              style={[styles.signupLink, { color: theme.colors.primary, fontWeight: 'bold' }]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error/Success Notification Snackbar */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={4000}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarVisible(false),
          }}
          style={{ backgroundColor: isSuccess ? '#15803D' : theme.colors.error }}
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
    marginBottom: 20,
  },
  logoIcon: {
    transform: [{ rotate: '45deg' }],
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 2,
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signupLink: {
    textDecorationLine: 'underline',
  },
});
