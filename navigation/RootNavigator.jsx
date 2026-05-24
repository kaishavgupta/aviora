import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store Import
import { useAuthStore } from '../store/authStore';

// Navigator & Screen Imports
import PassengerNavigator from './PassengerNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../app/passenger/SplashScreen';
import LoginScreen from '../app/passenger/LoginScreen';
import SignupScreen from '../app/passenger/SignupScreen';

import { DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';

const AuthStack = createStackNavigator();

/**
 * Navigation flow for unauthenticated users.
 * Houses Splash, Login, and Signup screen routes.
 * 
 * @returns {React.JSX.Element} Auth Stack Navigator.
 */
function AuthNavigator({ initialRouteName }) {
  return (
    <AuthStack.Navigator initialRouteName={initialRouteName || 'Splash'} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * RootNavigator component acting as the main routing gateway of the app.
 * Listens to Zustand's useAuthStore and directs user traffic dynamically:
 * - Loading: Shows custom Aviora splash loader
 * - Unauthenticated: Loads Splash/Login/Signup flow
 * - Passenger: Loads PassengerNavigator stack
 * - Staff/Admin: Loads AdminNavigator stack and tabs
 * 
 * @returns {React.JSX.Element} Root App Navigation Container.
 */
export default function RootNavigator() {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const theme = useTheme();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const redirectToLogin = useAuthStore((state) => state.redirectToLogin);

  // Blend Paper theme colors with standard React Navigation settings
  const navTheme = {
    ...(isDarkMode ? NavDarkTheme : NavDefaultTheme),
    colors: {
      ...(isDarkMode ? NavDarkTheme.colors : NavDefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
    }
  };

  // Show a premium branded loader when checking Firebase Auth persistence status
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons 
          name="airplane" 
          size={80} 
          color={theme.colors.onPrimary} 
          style={styles.logoIcon}
        />
        <Text variant="headlineLarge" style={[styles.brandText, { color: theme.colors.onPrimary }]}>
          AVIORA
        </Text>
        <ActivityIndicator 
          animating={true} 
          color={theme.colors.secondary || '#F59E0B'} 
          size="large" 
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!isAuthenticated ? (
        <AuthNavigator initialRouteName={redirectToLogin ? 'Login' : 'Splash'} />
      ) : role === 'passenger' ? (
        <PassengerNavigator />
      ) : (
        <AdminNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    transform: [{ rotate: '45deg' }],
    marginBottom: 10,
  },
  brandText: {
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 30,
  },
  spinner: {
    marginTop: 20,
  },
});
