import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * FormSection component.
 * Groups form inputs inside a card style surface with title header and custom icon dividers.
 * 
 * @param {Object} props - Component properties.
 * @param {string} props.title - Title label text.
 * @param {string} [props.icon] - Icon name.
 * @param {React.ReactNode} props.children - Child input nodes.
 * @returns {React.JSX.Element} The FormSection component.
 */
export default function FormSection({ title, icon, children }) {
  const theme = useTheme();

  return (
    <Card 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.colors.surface, 
          borderColor: theme.colors.outline + '30',
          borderWidth: 1 
        }
      ]}
      elevation={1}
    >
      <Card.Content style={styles.cardContent}>
        {/* Section Header */}
        <View style={[styles.headerRow, { borderBottomColor: theme.colors.outline + '30' }]}>
          {icon && (
            <MaterialCommunityIcons 
              name={icon} 
              size={20} 
              color={theme.colors.primary} 
              style={{ marginRight: 8 }} 
            />
          )}
          <Text variant="titleMedium" style={[styles.title, { color: theme.colors.primary }]}>
            {title}
          </Text>
        </View>
        
        {/* Child Fields */}
        <View style={styles.contentBody}>
          {children}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  title: {
    fontWeight: 'bold',
  },
  contentBody: {
    width: '100%',
  },
});
