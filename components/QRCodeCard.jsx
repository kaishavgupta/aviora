import React from 'react';
import { StyleSheet, View, Share, Platform } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * QRCodeCard component.
 * Renders the unique requestId inside a QR code, suitable for airport scanning.
 * Provides a share trigger using React Native's native Share API and summarizes passenger details.
 * 
 * @param {Object} props - Component props.
 * @param {string} props.requestId - The Firestore document ID.
 * @param {string} props.passengerName - Passenger full name.
 * @param {string} props.flightNumber - Flight number.
 * @param {string} props.assistanceType - Assistance service type.
 * @returns {React.JSX.Element} QRCodeCard component.
 */
export default function QRCodeCard({
  requestId,
  passengerName,
  flightNumber,
  assistanceType,
}) {
  const theme = useTheme();

  /**
   * Invokes the device's native sharing sheet with request meta details.
   */
  const handleShare = async () => {
    try {
      const shareMessage = `Aviora Airport Assistance Request\n\nRequest ID: ${requestId}\nPassenger: ${passengerName}\nFlight: ${flightNumber}\nService: ${assistanceType}\n\nShow this ID at any airport assistance desk.`;
      
      await Share.share({
        message: shareMessage,
        title: 'Aviora Assistance QR Code',
      });
    } catch (error) {
      console.error('Error sharing request details:', error);
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={4}>
      <Card.Content style={styles.cardContent}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="airplane" size={24} color={theme.colors.primary} style={styles.airplaneIcon} />
          <Text variant="titleMedium" style={[styles.headerTitle, { color: theme.colors.primary }]}>
            Assistance QR Code
          </Text>
        </View>

        {/* QR Code Graphic wrapper */}
        <View style={[styles.qrContainer, { borderColor: theme.colors.outline }]}>
          <QRCode
            value={requestId}
            size={180}
            color={theme.colors.primary}
            backgroundColor="#FFFFFF"
          />
        </View>

        {/* Monospaced Request ID */}
        <Text variant="bodyMedium" style={[styles.idText, { color: theme.colors.placeholder }]}>
          {requestId}
        </Text>

        <View style={styles.divider} />

        {/* Meta rows */}
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.placeholder} />
          <Text variant="bodyMedium" style={[styles.infoText, { color: theme.colors.text }]}>
            Passenger: <Text style={styles.boldText}>{passengerName}</Text>
          </Text>
        </View>

        <View style={[styles.infoRow, { marginTop: 6 }]}>
          <MaterialCommunityIcons name="ticket-outline" size={18} color={theme.colors.placeholder} />
          <Text variant="bodyMedium" style={[styles.infoText, { color: theme.colors.text }]}>
            Flight: <Text style={styles.boldText}>{flightNumber}</Text> | {assistanceType}
          </Text>
        </View>

        {/* Share Action */}
        <Button
          mode="outlined"
          onPress={handleShare}
          style={styles.shareButton}
          icon="share-variant"
        >
          Share Details
        </Button>

        {/* Guidance disclaimer note */}
        <Text variant="bodySmall" style={[styles.footerNote, { color: theme.colors.placeholder }]}>
          Show this QR code at any airport check-in or assistance counter.
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: 12,
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  airplaneIcon: {
    transform: [{ rotate: '45deg' }],
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  qrContainer: {
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  idText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
  },
  boldText: {
    fontWeight: 'bold',
  },
  shareButton: {
    width: '100%',
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  footerNote: {
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 11,
  },
});
