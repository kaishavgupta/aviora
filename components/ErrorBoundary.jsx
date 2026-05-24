import React, { Component } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * ErrorBoundary class component.
 * Catches JavaScript errors in child component trees, logs occurrences,
 * and renders friendly fallback screens instead of application crashes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <MaterialCommunityIcons 
            name="alert-decagram-outline" 
            size={80} 
            color="#DC2626" 
            style={styles.icon} 
          />
          <Text variant="headlineSmall" style={styles.title}>
            Something went wrong
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            An unexpected error occurred within the application. Please try resetting or restarting the app.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText} numberOfLines={8}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}

          <Button 
            mode="contained" 
            onPress={this.handleReset}
            style={styles.btn}
            buttonColor="#DC2626"
            textColor="#FFFFFF"
          >
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#0F172A',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    color: '#64748B',
  },
  debugBox: {
    width: '100%',
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  debugText: {
    fontSize: 11,
    color: '#0F172A',
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 16,
  },
});
