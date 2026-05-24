import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAssistanceTypeById } from '../constants/assistanceTypes';
import { STATUS_COLORS } from '../constants/statusFlow';

/**
 * Formats a timestamp into a "DD MMM YYYY" string.
 * 
 * @param {any} dateVal - Date input.
 * @returns {string} Formatted date.
 */
const formatTravelDateOnly = (dateVal) => {
  if (!dateVal) return '';
  let dateObj;
  if (dateVal && typeof dateVal.toDate === 'function') {
    dateObj = dateVal.toDate();
  } else {
    dateObj = new Date(dateVal);
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Calculates human readable relative time from a timestamp.
 * 
 * @param {any} ts - Creation timestamp.
 * @returns {string} Relative timeframe text.
 */
const getTimeAgo = (ts) => {
  if (!ts) return '';
  let dateObj;
  if (ts && typeof ts.toDate === 'function') {
    dateObj = ts.toDate();
  } else {
    dateObj = new Date(ts);
  }
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
};

/**
 * RequestCard component.
 * Displays a summary of a passenger assistance request.
 * Renders passenger details, status badge, journey details, timing, and staff assignment.
 * 
 * @param {Object} props - Component properties.
 * @param {Object} props.request - The Firestore request document object.
 * @param {Function} props.onPress - Tap action handler.
 * @returns {React.JSX.Element} The RequestCard component.
 */
export default function RequestCard({ request, onPress }) {
  const theme = useTheme();

  // Retrieve assistance icon and title mapping
  const assistanceInfo = getAssistanceTypeById(request.assistanceType) || {
    label: request.assistanceType || 'Special Assistance',
    icon: 'help-circle-outline',
  };

  // Retrieve status colors map
  const statusColors = STATUS_COLORS[request.status] || {
    bg: '#EEF2F6',
    text: '#64748B',
  };

  return (
    <Card 
      style={[styles.card, { backgroundColor: theme.colors.surface }]} 
      elevation={2} 
      onPress={onPress}
    >
      <Card.Content style={styles.cardContent}>
        {/* Row 1: Passenger Name & Status Badge */}
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={[styles.passengerName, { color: theme.colors.onSurface }]}>
            {request.passengerName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {request.status}
            </Text>
          </View>
        </View>

        {/* Row 2: Assistance Type (Icon + Label) */}
        <View style={styles.assistanceRow}>
          <Avatar.Icon 
            size={22} 
            icon={assistanceInfo.icon} 
            style={{ backgroundColor: theme.colors.primary + '15' }}
            color={theme.colors.primary}
          />
          <Text variant="bodyMedium" style={[styles.assistanceLabel, { color: theme.colors.primary }]}>
            {assistanceInfo.label}
          </Text>
        </View>

        {/* Row 3: Airport name | Flight: {flightNumber} | PNR: {pnr} */}
        <Text variant="bodyMedium" style={[styles.journeyText, { color: theme.colors.onSurfaceVariant }]}>
          {request.airportName} | Flight: {request.flightNumber} | PNR: {request.pnr || 'N/A'}
        </Text>

        {/* Row 4: Travel date formatted as "DD MMM YYYY" | Submitted: time ago */}
        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.placeholder }]}>
            Travel Date: {formatTravelDateOnly(request.travelDate)}
          </Text>
          <Text variant="bodySmall" style={[styles.metaText, { color: theme.colors.placeholder }]}>
            Submitted: {getTimeAgo(request.createdAt)}
          </Text>
        </View>

        {/* Row 5: Assigned staff name (italic grey if assigned) */}
        {request.assignedStaff && (
          <View style={styles.staffRow}>
            <MaterialCommunityIcons name="account-clock" size={14} color={theme.colors.outline} />
            <Text variant="bodySmall" style={[styles.staffText, { color: theme.colors.outline }]}>
              Assigned to: {request.assignedStaff.staffName || request.assignedStaff.name}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passengerName: {
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  assistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistanceLabel: {
    marginLeft: 6,
    fontWeight: 'bold',
  },
  journeyText: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  staffText: {
    marginLeft: 6,
    fontStyle: 'italic',
    fontSize: 12,
  },
});
