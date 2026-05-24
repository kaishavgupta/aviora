import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Share, 
  Linking, 
  LayoutAnimation, 
  Platform, 
  UIManager
} from 'react-native';
import { Card, Text, Button, Avatar, ActivityIndicator, Snackbar, IconButton, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Service, Store & Component Imports
import { getPassengerRequests, subscribeToRequest, rateAssistance } from '../../services/requestService';
import { getAssistanceTypeById } from '../../constants/assistanceTypes';
import { STATUS_COLORS } from '../../constants/statusFlow';
import StatusTimeline from '../../components/StatusTimeline';
import QRCodeCard from '../../components/QRCodeCard';
import { useRequestStore } from '../../store/requestStore';
import { useAuthStore } from '../../store/authStore';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Formats full timestamp values for presentation.
 * 
 * @param {any} dateVal - Firestore Timestamp or ISO date.
 * @returns {string} Formatted date.
 */
const formatTravelDate = (dateVal) => {
  if (!dateVal) return '';
  let dateObj;
  if (dateVal && typeof dateVal.toDate === 'function') {
    dateObj = dateVal.toDate();
  } else {
    dateObj = new Date(dateVal);
  }
  return dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Helper to parse document name from a Firebase Storage download URL.
 * 
 * @param {string} url - Public Firebase download URL.
 * @param {number} index - Index fallback.
 * @returns {string} Human readable title of the document.
 */
const getDocumentNameFromUrl = (url, index) => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    const filenameWithParams = parts[parts.length - 1];
    const filename = filenameWithParams.split('?')[0];
    const subparts = filename.split('_');
    if (subparts.length > 0) {
      const type = subparts[0].toLowerCase();
      if (type === 'id') return 'Identity Verification';
      if (type === 'ticket') return 'Flight Ticket / Boarding Pass';
      if (type === 'medical') return 'Medical Certification Document';
    }
    return filename;
  } catch (e) {
    return `Attachment Document ${index + 1}`;
  }
};

/**
 * RequestTrackingScreen component.
 * Allows passengers to monitor request progress in real-time.
 * Synchronizes with Firestore document snapshot triggers, embeds StatusTimeline details,
 * renders collapsible QRCodeCards, and opens external communication URLs.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @param {Object} props.route - Route state and parameters.
 * @returns {React.JSX.Element} RequestTrackingScreen layout.
 */
export default function RequestTrackingScreen({ navigation, route }) {
  const theme = useTheme();
  
  // Retrieve tracking identifier from route params
  const { requestId } = route.params || {};
  const { user } = useAuthStore();
  const { requests, setRequests, setActiveRequest } = useRequestStore();

  // Screen states
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [selectedTab, setSelectedTab] = useState('open');

  // Notification Toast states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setListLoading(false);
      return undefined;
    }

    setListLoading(true);
    const unsubscribe = getPassengerRequests(user.uid, (data) => {
      setRequests(data);
      setListLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid, setRequests]);

  useEffect(() => {
    if (!requestId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to Firestore updates for this request ID
    const unsubscribe = subscribeToRequest(
      requestId,
      (updatedData) => {
        if (updatedData) {
          setRequest(updatedData);
          setActiveRequest(updatedData);
        } else {
          setError('The requested assistance record was not found.');
        }
        setIsLoading(false);
      },
      (err) => {
        setError('Connection to server failed. Please check network.');
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      setActiveRequest(null);
    };
  }, [requestId, setActiveRequest]);

  // Set up header right share button dynamically when request is loaded
  const isClosedRequest = (item) => item?.status === 'Completed' || item?.status === 'Cancelled';

  useEffect(() => {
    const canShare = request && !isClosedRequest(request) && request.requestId;
    navigation.setOptions({
      headerRight: canShare
        ? () => (
          <IconButton
            icon="share-variant"
            iconColor={theme.colors.onPrimary}
            accessibilityLabel="Share Request ID"
            onPress={handleShareRequestId}
          />
        )
        : undefined,
    });
  }, [navigation, request, theme.colors.onPrimary]);

  /**
   * Invokes share dialog to share the active Request ID.
   */
  const handleShareRequestId = async () => {
    if (!request) return;
    try {
      await Share.share({
        message: `Aviora Assistance Request ID: ${request.requestId}\nPassenger: ${request.passengerName}\nFlight: ${request.flightNumber}`,
      });
    } catch (err) {
      console.error('Error sharing request:', err);
    }
  };

  /**
   * Toggles QR Code card visibility with smooth animation transition.
   */
  const toggleQRCode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowQR(!showQR);
  };

  /**
   * Opens default phone dialer to contact staff.
   * 
   * @param {string} mobile - The contact number.
   */
  const handleCallStaff = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => {
      setSnackbarMsg('Could not launch phone dialer.');
      setSnackbarVisible(true);
    });
  };

  /**
   * Opens the file link in browser/PDF viewer.
   * 
   * @param {string} url - Public download link.
   */
  const handleViewDocument = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      setSnackbarMsg('Could not open document URL.');
      setSnackbarVisible(true);
    });
  };

  /**
   * Handles saving a passenger's star rating for completed assistance.
   * 
   * @param {number} rating - The number of stars (1-5).
   */
  const handleRate = async (rating) => {
    if (!request || !request.requestId) return;
    try {
      await rateAssistance(request.requestId, rating);
      setSnackbarMsg('Thank you for your feedback!');
      setSnackbarVisible(true);
    } catch (err) {
      setSnackbarMsg(err.message);
      setSnackbarVisible(true);
    }
  };

  const openRequests = requests.filter((item) => !isClosedRequest(item));
  const closedRequests = requests.filter(isClosedRequest);

  const renderClosedSummary = (item) => {
    const assistanceInfo = getAssistanceTypeById(item.assistanceType) || {
      label: item.assistanceType || 'Special Assistance',
      icon: 'help-circle-outline',
    };

    return (
      <Card key={item.id || item.requestId} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Card.Content>
          <View style={styles.closedHeader}>
            <Avatar.Icon
              size={34}
              icon={assistanceInfo.icon}
              style={{ backgroundColor: theme.colors.primary + '10' }}
              color={theme.colors.primary}
            />
            <View style={styles.closedTitleWrap}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {assistanceInfo.label}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.placeholder }}>
                Closed: {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.summaryMetaContainer}>
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Passenger: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.passengerName}</Text>
            </Text>
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Flight: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.flightNumber}</Text>
            </Text>
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Airport: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.airportName}</Text>
            </Text>
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Travel Date: <Text style={[styles.boldText, { color: theme.colors.text }]}>{formatTravelDate(item.travelDate)}</Text>
            </Text>
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Assistance Provided: <Text style={[styles.boldText, { color: theme.colors.text }]}>{assistanceInfo.label}</Text>
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderOpenRequest = (item) => {
    const assistanceInfo = getAssistanceTypeById(item.assistanceType) || {
      label: item.assistanceType || 'Special Assistance',
      icon: 'help-circle-outline',
    };
    const statusColors = STATUS_COLORS[item.status] || { bg: theme.colors.surface, text: theme.colors.subtext };

    return (
      <Card key={item.id || item.requestId} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <View style={styles.assistanceLabelWrapper}>
              <Avatar.Icon
                size={32}
                icon={assistanceInfo.icon}
                style={{ backgroundColor: theme.colors.primary + '10' }}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={[styles.assistanceTitle, { color: theme.colors.primary }]}>
                {assistanceInfo.label}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
            Flight: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.flightNumber}</Text>
          </Text>
          <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
            Airport: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.airportName}</Text>
          </Text>
          {item.assignedStaff ? (
            <Text variant="bodyMedium" style={[styles.metaRow, { color: theme.colors.text }]}>
              Assigned Staff: <Text style={[styles.boldText, { color: theme.colors.text }]}>{item.assignedStaff.staffName || item.assignedStaff.name}</Text>
            </Text>
          ) : null}

          <View style={styles.requestActions}>
            <Button
              mode="contained"
              compact
              onPress={() => navigation.setParams({ requestId: item.requestId || item.id })}
            >
              Track
            </Button>
            {item.assignedStaff && (
              <Button
                mode="outlined"
                compact
                icon="message-text-outline"
                onPress={() => navigation.navigate('PassengerComm', {
                  requestId: item.requestId || item.id,
                  passengerName: item.assignedStaff.staffName || item.assignedStaff.name || 'Assigned Staff',
                })}
              >
                Chat
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render Loader screen
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 12, color: theme.colors.placeholder }}>
          Loading request details...
        </Text>
      </View>
    );
  }

  // Render request list if no requestId passed
  if (!requestId) {
    const listData = selectedTab === 'open' ? openRequests : closedRequests;

    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.tabRow}>
          <Chip
            selected={selectedTab === 'open'}
            onPress={() => setSelectedTab('open')}
            style={styles.tabChip}
            mode={selectedTab === 'open' ? 'flat' : 'outlined'}
          >
            Open ({openRequests.length})
          </Chip>
          <Chip
            selected={selectedTab === 'closed'}
            onPress={() => setSelectedTab('closed')}
            style={styles.tabChip}
            mode={selectedTab === 'closed' ? 'flat' : 'outlined'}
          >
            Closed ({closedRequests.length})
          </Chip>
        </View>

        {listLoading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator animating color={theme.colors.primary} />
          </View>
        ) : listData.length === 0 ? (
          <View style={styles.centerPad}>
            <Avatar.Icon
              size={64}
              icon={selectedTab === 'open' ? 'clipboard-check-outline' : 'archive-outline'}
              style={{ backgroundColor: theme.colors.outline + '20' }}
              color={theme.colors.placeholder}
            />
            <Text variant="titleMedium" style={{ marginTop: 12, fontWeight: 'bold' }}>
              No {selectedTab} requests
            </Text>
          </View>
        ) : (
          listData.map((item) => selectedTab === 'open' ? renderOpenRequest(item) : renderClosedSummary(item))
        )}
      </ScrollView>
    );
  }

  // Render Error state screen
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={60} color={theme.colors.error} />
        <Text variant="titleLarge" style={[styles.errorTitle, { color: theme.colors.error }]}>
          Error Occurred
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtitle}>
          {error}
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.setParams({ requestId: undefined })} 
          style={styles.retryBtn}
        >
          Go Back
        </Button>
      </View>
    );
  }

  // If request becomes null unexpectedly, show a safe fallback UI
  if (!request) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-outline" size={64} color={theme.colors.error} />
        <Text variant="titleLarge" style={[styles.errorTitle, { color: theme.colors.error }]}>Data unavailable</Text>
        <Text variant="bodyMedium" style={styles.errorSubtitle}>
          The request data is not available right now. Try again or verify the Request ID.
        </Text>
        <Button mode="contained" onPress={() => navigation.setParams({ requestId: undefined })} style={styles.retryBtn}>
          Go Back
        </Button>
      </View>
    );
  }

  // Retrieve matching category icon details
  const assistanceInfo = getAssistanceTypeById(request.assistanceType) || {
    label: 'Special Assistance',
    icon: 'help-circle-outline',
  };

  const statusColors = STATUS_COLORS[request.status] || { bg: theme.colors.surface, text: theme.colors.subtext };
  const closedDetail = isClosedRequest(request);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* SECTION 1: Summary Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={styles.assistanceLabelWrapper}>
                <Avatar.Icon 
                  size={32} 
                  icon={assistanceInfo.icon} 
                  style={{ backgroundColor: theme.colors.primary + '10' }} 
                  color={theme.colors.primary} 
                />
                <Text variant="titleMedium" style={[styles.assistanceTitle, { color: theme.colors.primary }]}>
                  {assistanceInfo.label}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {request.status}
                </Text>
              </View>
            </View>

            <View style={styles.summaryMetaContainer}>
              <Text variant="bodyLarge" style={[styles.metaRow, { color: theme.colors.text }]}>
                Flight: <Text style={[styles.boldText, { color: theme.colors.text }]}>{request.flightNumber}</Text> ({request.journeyType})
              </Text>
              <Text variant="bodyLarge" style={[styles.metaRow, { color: theme.colors.text }]}>
                Airport: <Text style={[styles.boldText, { color: theme.colors.text }]}>{request.airportName}</Text>
              </Text>
              <Text variant="bodyLarge" style={[styles.metaRow, { color: theme.colors.text }]}>
                PNR / Terminal: <Text style={[styles.boldText, { color: theme.colors.text }]}>{request.pnrNumber}</Text> {request.terminalGate ? `• ${request.terminalGate}` : ''}
              </Text>
              <Text variant="bodyLarge" style={[styles.metaRow, { color: theme.colors.text }]}>
                Travel Date: <Text style={[styles.boldText, { color: theme.colors.text }]}>{formatTravelDate(request.travelDate)}</Text>
              </Text>
            </View>

            {!closedDetail && (
              <>
                <View style={[styles.cardDivider, { borderBottomColor: theme.colors.border, borderBottomWidth: 1 }]} />
                <Text variant="bodySmall" style={[styles.monoId, { color: theme.colors.placeholder }]}>
                  ID: {request.requestId}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* SECTION 2: Assigned Staff Info (rendered conditionally) */}
        {request.assignedStaff && (
          <Card style={[styles.card, styles.staffCard, { backgroundColor: theme.colors.primary + '08' }]} mode="outlined">
            <Card.Content style={styles.staffCardContent}>
              <View style={styles.staffHeader}>
                <Avatar.Icon size={44} icon="account-tie" style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
                <View style={styles.staffNameWrapper}>
                  <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                    Assigned Assistant
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {request.assignedStaff.staffName}
                  </Text>
                </View>
              </View>
              <View style={styles.staffActionsRow}>
                <Button
                  mode="contained"
                  onPress={() => handleCallStaff(request.assignedStaff.staffMobile || request.passengerMobile)}
                  icon="phone"
                  style={styles.staffActionBtn}
                  contentStyle={styles.staffActionBtnContent}
                >
                  Call Staff
                </Button>
                {!closedDetail && (
                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('PassengerComm', {
                      requestId: request.requestId || request.id,
                      passengerName: request.assignedStaff.staffName || request.assignedStaff.name || 'Assigned Staff',
                    })}
                    icon="message-text-outline"
                    style={styles.staffActionBtn}
                    contentStyle={styles.staffActionBtnContent}
                  >
                    Chat
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        )}


        {/* SECTION 3: Timeline Progress */}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Assistance Timeline
        </Text>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Card.Content>
            <StatusTimeline 
              statusHistory={request.statusHistory} 
              currentStatus={request.status} 
            />
          </Card.Content>
        </Card>

        {!closedDetail && (
          <Button 
            mode="outlined" 
            onPress={toggleQRCode} 
            style={styles.qrToggleBtn}
            icon={showQR ? 'chevron-up' : 'qrcode'}
          >
            {showQR ? 'Hide QR Code' : 'Show Assistance QR'}
          </Button>
        )}

        {!closedDetail && showQR && (
          <QRCodeCard
            requestId={request.requestId}
            passengerName={request.passengerName}
            flightNumber={request.flightNumber}
            assistanceType={assistanceInfo.label}
          />
        )}

        {/* SECTION 4: Feedback Rating (rendered conditionally for completed requests) */}
        {closedDetail && (
          <View>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Feedback
            </Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                {request.rating ? (
                  <>
                    <Text variant="bodyLarge" style={{ marginBottom: 10, fontWeight: 'bold' }}>You rated this service:</Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons
                          key={star}
                          name={star <= request.rating ? 'star' : 'star-outline'}
                          size={32}
                          color={star <= request.rating ? '#FFD700' : theme.colors.placeholder}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text variant="bodyLarge" style={{ marginBottom: 10, fontWeight: 'bold' }}>Rate your assistant:</Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                          <MaterialCommunityIcons
                            name="star-outline"
                            size={36}
                            color={theme.colors.placeholder}
                            style={{ marginHorizontal: 4 }}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* SECTION 5: Special Requirements Notes (rendered conditionally) */}
        {(request.specialRequirements || request.specialNotes) ? (
          <View>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Special Requirements Notes
            </Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.italicNotes}>
                  "{request.specialRequirements || request.specialNotes}"
                </Text>
              </Card.Content>
            </Card>
          </View>
        ) : null}

        {/* SECTION 6: Document List attachments (rendered conditionally) */}
        {!closedDetail && request.documentUrls && request.documentUrls.length > 0 && (
          <View>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Uploaded Documents
            </Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Card.Content style={{ paddingVertical: 8 }}>
                {request.documentUrls.map((url, idx) => (
                  <View key={url} style={styles.docRow}>
                    <View style={styles.docLeft}>
                      <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                      <Text variant="bodyMedium" style={styles.docName} numberOfLines={1}>
                        {getDocumentNameFromUrl(url, idx)}
                      </Text>
                    </View>
                    <Button 
                      mode="text" 
                      compact 
                      onPress={() => handleViewDocument(url)}
                      icon="open-in-new"
                    >
                      View
                    </Button>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Snackbar alerts */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ backgroundColor: theme.colors.error }}
        action={{ label: 'Dismiss', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tabChip: {
    marginRight: 8,
  },
  centerPad: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },
  errorTitle: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorSubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryBtn: {
    width: '60%',
    borderRadius: 8,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assistanceLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  assistanceTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  summaryMetaContainer: {
    marginBottom: 12,
  },
  metaRow: {
    marginTop: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  monoId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  staffCard: {
    borderWidth: 1,
  },
  staffCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  staffNameWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  staffActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  staffActionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  staffActionBtnContent: {
    height: 40,
  },

  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  closedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  closedTitleWrap: {
    marginLeft: 10,
    flex: 1,
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  qrToggleBtn: {
    borderRadius: 8,
    marginBottom: 16,
  },
  italicNotes: {
    fontStyle: 'italic',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.8,
  },
  docName: {
    marginLeft: 12,
    fontWeight: '500',
  },
});
