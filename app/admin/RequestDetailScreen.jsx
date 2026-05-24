import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, Linking, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useTheme, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { getRequestListener, updateRequestStatus } from '../../services/requestService';
import StatusTimeline from '../../components/StatusTimeline';
import ScannerModal from '../../components/ScannerModal';
import { STATUS_ICONS, STATUS_COLORS } from '../../constants/statusFlow';

/**
 * Calculates human readable relative time from a timestamp.
 * 
 * @param {any} ts - Timestamp input.
 * @returns {string} Relative timeframe.
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

/**
 * RequestDetailScreen component.
 * Displays detailed information about a single assistance request.
 * Contains status progress tracks, traveler details, document download rows,
 * history timelines, and quick CTA actions for assignment, status progression, or texting.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.route - Navigation route parameters.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} RequestDetailScreen layout.
 */
export default function RequestDetailScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const theme = useTheme();

  const { addUnsubscribe, cleanupListeners } = useRequestStore();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const { user, userProfile } = useAuthStore();

  const isStaff = userProfile?.role === 'staff';
  const isAdmin = userProfile?.role === 'admin';
  const isAssignedToMe = isStaff && request?.assignedStaff?.uid === user?.uid;
  const canViewRequest = isAdmin || !isStaff || isAssignedToMe;

  const canAccept = isAssignedToMe && request?.status === 'Staff Assigned';
  const canStart = isAssignedToMe && request?.status === 'Passenger Contacted';
  const canComplete = isAssignedToMe && request?.status === 'Assistance In Progress';
  const canAssign = isAdmin && request?.status === 'Under Review';
  const canReassign = isAdmin && !!request?.assignedStaff;
  const canUpdateStatus = isAdmin || isAssignedToMe;
  const canChat = (isAdmin || isAssignedToMe) && !!request?.userId;

  // Keep a reference of the request to avoid stale closure state in real-time updates
  const requestRef = useRef(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = getRequestListener(requestId, (data) => {
      if (!data) {
        setLoading(false);
        return;
      }
      
      const prev = requestRef.current;
      // Show notification if status or updatedAt changed externally
      if (prev && (prev.status !== data.status || prev.updatedAt !== data.updatedAt)) {
        setSnackbarMsg('Request updated');
        setSnackbarVisible(true);
      }
      
      requestRef.current = data;
      setRequest(data);
      setLoading(false);
    });

    addUnsubscribe(unsubscribe);

    return () => {
      cleanupListeners();
    };
  }, [requestId]);

  // Set navigation header title
  useEffect(() => {
    if (requestId) {
      navigation.setOptions({
        title: `Request #${requestId.slice(0, 8).toUpperCase()}`,
      });
    }
  }, [navigation, requestId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Request Not Found
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!canViewRequest) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Access Restricted
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>
          Staff members can only open requests assigned to them.
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const statusColors = STATUS_COLORS[request.status] || { bg: theme.colors.surface, text: theme.colors.subtext };
  const statusIcon = STATUS_ICONS[request.status] || 'bell-outline';

  const standardSteps = [
    'New Request',
    'Under Review',
    'Staff Assigned',
    'Passenger Contacted',
    'Assistance In Progress',
    'Completed',
  ];

  const currentStepIndex = standardSteps.indexOf(request.status);

  // Calculates time ago string for banner
  const getLastUpdateDetails = () => {
    if (!request.statusHistory || request.statusHistory.length === 0) return '';
    const sorted = [...request.statusHistory].sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    const last = sorted[0];
    const updater = last.updatedBy || 'System';
    const timeText = getTimeAgo(last.timestamp);
    return `Last updated: ${timeText} by ${updater}`;
  };

  // Dial passenger trigger
  const handleCallPassenger = (mobile) => {
    if (!mobile) return;
    const phoneUrl = `tel:${mobile}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Calling is not supported on this device.');
        }
      })
      .catch((err) => console.error('Error calling phone:', err));
  };

  const handleStatusChange = async (newStatus, note) => {
    if (!requestId || !request) return;
    setActionLoading(true);
    try {
      await updateRequestStatus(
        requestId,
        newStatus,
        note,
        userProfile?.name || 'Staff Member',
        request.userId
      );
      setSnackbarMsg(`Status updated to ${newStatus}`);
      setSnackbarVisible(true);
    } catch (err) {
      console.error('Error changing status:', err);
      setSnackbarMsg(err.message || 'Unable to update the request status.');
      setSnackbarVisible(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQRScan = (scannedData) => {
    setScannerVisible(false);
    if (scannedData === requestId) {
      handleStatusChange('Assistance In Progress', 'QR Code successfully verified. Assistance started.');
    } else {
      setSnackbarMsg('Invalid QR Code. Does not match this request.');
      setSnackbarVisible(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColors.bg }]}>
          <View style={styles.bannerHeader}>
            <MaterialCommunityIcons name={statusIcon} size={28} color={statusColors.text} />
            <Text variant="headlineSmall" style={[styles.bannerTitle, { color: statusColors.text }]}>
              {request.status}
            </Text>
          </View>
          
          {/* Progress dots */}
          {currentStepIndex !== -1 && (
            <View style={styles.progressRow}>
              {standardSteps.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                return (
                  <React.Fragment key={step}>
                    <View 
                      style={[
                        styles.progressDot, 
                        { backgroundColor: isActive ? statusColors.text : theme.colors.border }
                      ]} 
                    />
                    {idx < standardSteps.length - 1 && (
                      <View 
                        style={[
                          styles.progressLine, 
                          { backgroundColor: isActive && idx < currentStepIndex ? statusColors.text : theme.colors.border }
                        ]} 
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          <Text variant="bodySmall" style={[styles.bannerSubtitle, { color: statusColors.text + 'B0' }]}>
            {getLastUpdateDetails()}
          </Text>
        </View>

        {/* Section 2: Passenger Information */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.text }]}>
                Passenger Information
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Name:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{request.passengerName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Mobile:</Text>
              <TouchableOpacity onPress={() => handleCallPassenger(request.passengerMobile)}>
                <Text style={[styles.detailValue, styles.linkValue, { color: theme.colors.primary }]}>
                  {request.passengerMobile}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Email:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{request.passengerEmail || 'N/A'}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Airport:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{request.airportName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Flight & PNR:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {request.flightNumber} • PNR: {request.pnr || 'N/A'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Journey Type:</Text>
              <View style={[styles.inlineBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 11 }}>
                  {request.flightType || 'DEPARTURE'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Travel Date:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {new Date(request.travelDate?.toDate ? request.travelDate.toDate() : request.travelDate).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.subtext }]}>Assistance:</Text>
              <Text style={[styles.detailValue, { fontWeight: 'bold', color: theme.colors.primary }]}>
                {request.assistanceType}
              </Text>
            </View>

            {request.specialRequirements ? (
              <View style={[styles.notesBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="information" size={16} color={theme.colors.outline} />
                <Text style={styles.notesText}>{request.specialRequirements}</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Staff / Admin Actions
              </Text>
            </View>

            {canChat && (
              <Button
                mode="contained"
                icon="message-text-outline"
                style={styles.actionButton}
                onPress={() => navigation.navigate('PassengerComm', { requestId, passengerName: request.passengerName })}
              >
                Chat with Passenger
              </Button>
            )}

            {canAssign && (
              <Button
                mode="outlined"
                icon="account-plus"
                style={styles.actionButton}
                onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
              >
                Assign Support Staff
              </Button>
            )}

            {canAccept && (
              <Button
                mode="contained"
                icon="check-decagram"
                loading={actionLoading}
                disabled={actionLoading}
                style={styles.actionButton}
                onPress={() => handleStatusChange('Passenger Contacted', 'Staff accepted the request and contacted the passenger.')}
              >
                Accept & Contact Passenger
              </Button>
            )}

            {canStart && (
              <Button
                mode="contained"
                icon="qrcode-scan"
                loading={actionLoading}
                disabled={actionLoading}
                style={styles.actionButton}
                onPress={() => setScannerVisible(true)}
              >
                Scan QR to Start
              </Button>
            )}

            {canComplete && (
              <Button
                mode="contained"
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onSecondary}
                icon="flag-checkered"
                loading={actionLoading}
                disabled={actionLoading}
                style={styles.actionButton}
                onPress={() => handleStatusChange('Completed', 'Assistance has been completed.')}
              >
                Mark as Completed
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Section 3: Uploaded Documents */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Uploaded Documents
              </Text>
            </View>

            {(!request.documentUrls || request.documentUrls.length === 0) ? (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                No documents uploaded
              </Text>
            ) : (
              request.documentUrls.map((url, idx) => {
                const isPdf = url.toLowerCase().includes('.pdf') || url.includes('pdf');
                const fileIcon = isPdf ? 'file-pdf-box' : 'file-image-outline';
                const displayName = `Attachment_${idx + 1}`;

                return (
                  <View key={idx} style={styles.documentRow}>
                    <View style={styles.documentLeft}>
                      <MaterialCommunityIcons name={fileIcon} size={22} color={theme.colors.primary} />
                      <Text style={styles.documentName} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>
                    <Button 
                      mode="text" 
                      compact
                      onPress={() => Linking.openURL(url).catch((err) => Alert.alert('Error', 'Unable to open file.'))}
                    >
                      View
                    </Button>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Section 5: Staff Assignment */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-cog-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Staff Assignment
              </Text>
            </View>

            {request.assignedStaff ? (
              <View style={styles.assignedContainer}>
                <View style={styles.staffMeta}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                    {request.assignedStaff.staffName || request.assignedStaff.name}
                  </Text>
                  {request.assignedStaff.mobile ? (
                    <Text variant="bodyMedium" style={{ color: theme.colors.placeholder }}>
                      Phone: {request.assignedStaff.mobile}
                    </Text>
                  ) : null}
                </View>
                {canReassign && (
                  <Button 
                    mode="outlined" 
                    compact 
                    onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
                  >
                    Reassign
                  </Button>
                )}
              </View>
            ) : (
              <View style={styles.assignedContainer}>
                <Text style={{ color: theme.colors.placeholder, fontStyle: 'italic' }}>
                  No staff assigned yet
                </Text>
                {canAssign && (
                  <Button 
                    mode="contained" 
                    compact 
                    onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
                  >
                    Assign Now
                  </Button>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Section 4: Status History */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="history" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Status Timeline
              </Text>
            </View>
            <StatusTimeline statusHistory={request.statusHistory || []} />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline + '40' }]}>
        <View style={styles.btnRow}>
          {canAssign && !request.assignedStaff ? (
            <Button 
              mode="contained" 
              style={[styles.btn, { flex: 1 }]}
              onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
            >
              Assign Staff
            </Button>
          ) : canReassign ? (
            <Button 
              mode="outlined" 
              style={[styles.btn, { flex: 1 }]}
              onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
            >
              Reassign
            </Button>
          ) : null}

          {canUpdateStatus && (
            <Button 
              mode="contained" 
              style={[styles.btn, { flex: 1.2, marginHorizontal: canAssign || canReassign || canChat ? 8 : 0 }]}
              onPress={() => navigation.navigate('StatusUpdate', { requestId, passengerId: request.userId })}
            >
              Update Status
            </Button>
          )}

          {canChat && (
            <Button 
              mode="outlined" 
              style={[styles.btn, { flex: 0.8 }]}
              onPress={() => navigation.navigate('PassengerComm', { requestId, passengerName: request.passengerName })}
            >
              Message
            </Button>
          )}
        </View>
      </View>

      {/* Snackbar Alert */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        action={{ label: 'Dismiss', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMsg}
      </Snackbar>

      <ScannerModal 
        visible={scannerVisible} 
        onClose={() => setScannerVisible(false)} 
        onScan={handleQRScan} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusBanner: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLine: {
    height: 2,
    width: 24,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '500',
    fontSize: 13,
  },
  detailValue: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  linkValue: {
    textDecorationLine: 'underline',
  },
  inlineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  notesBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  notesText: {
    marginLeft: 8,
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  actionButton: {
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentName: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  assignedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffMeta: {
    flex: 1,
    paddingRight: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    elevation: 4,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    borderRadius: 8,
  },
});
