import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STATUS_ICONS, STATUS_COLORS } from '../constants/statusFlow';

/**
 * Helper to format timestamps (Firestore Timestamp or ISO strings) into readable dates.
 * 
 * @param {any} ts - The timestamp value.
 * @returns {string} Formatted timestamp.
 */
const formatTimestamp = (ts) => {
  if (!ts) return '';
  let dateObj;
  if (ts && typeof ts.toDate === 'function') {
    dateObj = ts.toDate();
  } else {
    dateObj = new Date(ts);
  }
  
  const day = dateObj.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

/**
 * StatusTimeline component.
 * Renders a vertical timeline representing the workflow progression of assistance requests.
 * Displays custom icons, chronological connectors, updater identity headers, and italics comments.
 * 
 * @param {Object} props - Component properties.
 * @param {Array<Object>} props.statusHistory - Log of status changes.
 * @returns {React.JSX.Element} The StatusTimeline component.
 */
export default function StatusTimeline({ statusHistory = [] }) {
  const theme = useTheme();

  // Create a sorted copy of statusHistory, showing most recent at the top
  const sortedHistory = [...statusHistory].sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  if (sortedHistory.length === 0) {
    // Empty state fallback as requested
    const defaultColor = STATUS_COLORS['New Request'] || { bg: '#E0F2FE', text: '#0369A1' };
    const defaultIcon = STATUS_ICONS['New Request'] || 'file-plus-outline';
    
    return (
      <View style={styles.container}>
        <View style={styles.timelineRow}>
          <View style={styles.leftCol}>
            <View style={[styles.circleNode, { backgroundColor: defaultColor.text }]}>
              <MaterialCommunityIcons name={defaultIcon} size={14} color="white" />
            </View>
          </View>
          <View style={styles.rightCol}>
            <Text variant="titleMedium" style={[styles.statusTitle, { color: defaultColor.text, fontWeight: 'bold' }]}>
              New Request
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
              No history recorded.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sortedHistory.map((item, index) => {
        const isLast = index === sortedHistory.length - 1;
        const colors = STATUS_COLORS[item.status] || { bg: '#EEF2F6', text: '#64748B' };
        const iconName = STATUS_ICONS[item.status] || 'bell-outline';

        return (
          <View key={index} style={styles.timelineRow}>
            {/* Left Column: Icon Circle & Vertical Connector Line */}
            <View style={styles.leftCol}>
              <View style={[styles.circleNode, { backgroundColor: colors.text }]}>
                <MaterialCommunityIcons name={iconName} size={14} color="white" />
              </View>
              {!isLast && (
                <View style={[styles.connectorLine, { backgroundColor: theme.colors.outline }]} />
              )}
            </View>

            {/* Right Column: Text Details */}
            <View style={styles.rightCol}>
              <View style={styles.headerRow}>
                <Text variant="titleMedium" style={[styles.statusTitle, { color: colors.text, fontWeight: 'bold' }]}>
                  {item.status}
                </Text>
                {item.updatedBy ? (
                  <Text variant="bodySmall" style={[styles.updatedByText, { color: theme.colors.placeholder }]}>
                    by {item.updatedBy}
                  </Text>
                ) : null}
              </View>

              <Text variant="bodySmall" style={[styles.timeText, { color: theme.colors.placeholder }]}>
                {formatTimestamp(item.timestamp)}
              </Text>

              {item.note ? (
                <Text variant="bodyMedium" style={[styles.noteText, { color: theme.colors.onSurfaceVariant }]}>
                  "{item.note}"
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 70,
  },
  leftCol: {
    width: 32,
    alignItems: 'center',
    position: 'relative',
  },
  circleNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  connectorLine: {
    width: 2,
    position: 'absolute',
    top: 24,
    bottom: 0,
    zIndex: 1,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  statusTitle: {
    fontSize: 15,
  },
  updatedByText: {
    marginLeft: 6,
    fontSize: 12,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
  noteText: {
    fontStyle: 'italic',
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
});
