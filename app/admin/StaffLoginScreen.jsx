import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * StaffLoginScreen placeholder screen for airport staff login.
 * Note: Staff log in through the main Login screen, but this file is preserved.
 * 
 * @returns {React.JSX.Element} The StaffLoginScreen component.
 */
export default function StaffLoginScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
        StaffLoginScreen
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.placeholder, marginTop: 8 }}>
        Dedicated Staff / Admin login gateway.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
