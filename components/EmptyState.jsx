import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * EmptyState component.
 * Displays visually-rich placeholder cards for lists that contain no items.
 * Renders large icons, bold titles, description texts, and optional CTA buttons.
 * 
 * @param {Object} props - Component properties.
 * @param {string} props.icon - Icon name.
 * @param {string} props.title - Empty headline text.
 * @param {string} props.subtitle - Descriptive detail text.
 * @param {string} [props.actionLabel] - Button text.
 * @param {Function} [props.onAction] - Button callback.
 * @returns {React.JSX.Element} The EmptyState component.
 */
export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons 
        name={icon} 
        size={80} 
        color={theme.colors.outline} 
        style={styles.icon} 
      />
      <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.placeholder }]}>
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <Button 
          mode="contained" 
          onPress={onAction}
          style={styles.btn}
          icon="plus"
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    width: '100%',
  },
  icon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  btn: {
    borderRadius: 8,
  },
});
