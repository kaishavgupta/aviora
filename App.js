import 'react-native-gesture-handler'; // Must be imported at the very top of the entry file
import React, { useEffect } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Theme & Navigation Imports
import { useThemeStore } from './store/themeStore';
import RootNavigator from './navigation/RootNavigator';
import ErrorBoundary from './components/ErrorBoundary';

// Ignore specific Expo Go warnings
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Variant headlineSmall was not provided properly'
]);

/**
 * Root component of the Aviora application.
 * Wraps the app layout with:
 * - GestureHandlerRootView: Enables gesture support for swipe/stack transitions
 * - PaperProvider: Serves standard React Native Paper design tokens (dynamic light/dark)
 * - ErrorBoundary: Catches unhandled JS runtime crashes
 * - RootNavigator: Governs conditional authenticated screens
 * - StatusBar: Adapts hardware status bar styles to theme selections
 * 
 * @returns {React.JSX.Element} The rendered root app.
 */
export default function App() {
  const { theme, isDarkMode, initTheme } = useThemeStore();

  // Load user theme choices on startup
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
        <StatusBar 
          style={isDarkMode ? 'light' : 'dark'} 
          backgroundColor={theme.colors.primary} 
        />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
