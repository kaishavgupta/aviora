import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, useTheme, ActivityIndicator, Snackbar, Portal, Dialog, RadioButton, Divider, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { getRequestById, updateRequestStatus } from '../../services/requestService';
import { getNextStatus, STATUS_ICONS, STATUS_COLORS } from '../../constants/statusFlow';

// Short descriptions for each status option
const STATUS_DESCRIPTIONS = {
  'Under Review': 'Request has been reviewed by staff',
  'Staff Assigned': 'A staff member has been assigned',
  'Passenger Contacted': 'Staff has contacted the passenger',
  'Assistance In Progress': 'Staff is actively helping the passenger',
  'Completed': 'Assistance has been successfully completed',
  'Cancelled': 'Request has been cancelled',
};

/**
 * StatusUpdateScreen component.
 * Guides staff members through progressing the request workflow state.
 * Enforces status sequence constraints, accepts annotation commentaries,
 * checks lengths, and posts updates to Firestore.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.route - Route state and parameters.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} StatusUpdateScreen layout.
 */
export default function StatusUpdateScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const theme = useTheme();
  const { user, userProfile } = useAuthStore();

  // Screen states
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [note, setNote] = useState('');

  // Interaction states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Fetch Request details on mount
  const loadRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await getRequestById(requestId);
      setRequest(data);
    } catch (err) {
      console.error('Error fetching request for status update:', err);
      setSnackbarMsg('Failed to load request details.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const handleUpdate = () => {
    if (!selectedStatus) return;
    setDialogVisible(true);
  };

  // Perform Firestore status updates on confirmation
  const handleConfirmUpdate = async () => {
    setDialogVisible(false);
    if (!selectedStatus || !request) return;

    setSubmitting(true);
    try {
      const staffName = userProfile?.name || 'Staff Member';
      // Call service: updateRequestStatus(requestId, newStatus, note, staffName, passengerId)
      await updateRequestStatus(requestId, selectedStatus, note.trim(), staffName, request.userId);

      setSnackbarMsg('Status updated successfully!');
      setSnackbarVisible(true);

      // Delay pop to let user see feedback
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error('Error updating status:', err);
      setSnackbarMsg(err.message || 'Failed to update request status.');
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

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

  const isAdmin = userProfile?.role === 'admin';
  const isStaff = userProfile?.role === 'staff';
  const isAssignedToMe = request.assignedStaff?.uid === user?.uid;

  if (isStaff && !isAssignedToMe) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Access Restricted
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>
          Only the assigned staff member can update this request.
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Access Restricted
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const currentColors = STATUS_COLORS[request.status] || { bg: theme.colors.surface, text: theme.colors.subtext };
  const currentIcon = STATUS_ICONS[request.status] || 'bell-outline';

  const isTerminal = request.status === 'Completed' || request.status === 'Cancelled';
  
  // Calculate allowed next status options
  const nextChronological = getNextStatus(request.status);
  const options = [];
  if (nextChronological && nextChronological !== 'Staff Assigned') {
    options.push(nextChronological);
  }

  // Cancelled is always available unless already completed/cancelled
  const showCancelledOption = !isTerminal;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Status Card */}
        <Card style={styles.summaryCard} elevation={1}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.placeholder, textTransform: 'uppercase', fontWeight: 'bold' }}>
              Current Status
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.badge, { backgroundColor: currentColors.bg }]}>
                <MaterialCommunityIcons name={currentIcon} size={14} color={currentColors.text} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: currentColors.text }]}>{request.status}</Text>
              </View>
            </View>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginTop: 10 }}>
              {request.passengerName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
              Assistance: {request.assistanceType}
            </Text>
          </Card.Content>
        </Card>

        {isTerminal ? (
          <View style={styles.terminalContainer}>
            <MaterialCommunityIcons name="lock-outline" size={48} color={theme.colors.placeholder} />
            <Text variant="bodyLarge" style={[styles.terminalText, { color: theme.colors.placeholder }]}>
              This request is already completed or cancelled. No further updates are permitted.
            </Text>
            <Button mode="contained" onPress={() => navigation.goBack()} style={styles.goBackBtn}>
              Go Back
            </Button>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Update Status To:
            </Text>

            {isAdmin && request.status === 'Under Review' && (
              <Button
                mode="contained"
                icon="account-plus"
                style={styles.assignBtn}
                onPress={() => navigation.navigate('AssignStaff', { requestId, passengerId: request.userId })}
              >
                Assign Support Staff
              </Button>
            )}

            {/* Standard Next Status Option */}
            {options.map((status) => {
              const colors = STATUS_COLORS[status] || { bg: theme.colors.surface, text: theme.colors.subtext };
              const icon = STATUS_ICONS[status] || 'bell-outline';
              const description = STATUS_DESCRIPTIONS[status] || 'Transition to next workflow milestone';
              const isSelected = selectedStatus === status;

              return (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.8}
                  onPress={() => setSelectedStatus(status)}
                    style={[
                    styles.optionCard,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                >
                  <View style={styles.optionContent}>
                    <Avatar.Icon size={36} icon={icon} style={{ backgroundColor: colors.bg }} color={colors.text} />
                    <View style={styles.optionText}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: colors.text }}>
                        {status}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
                        {description}
                      </Text>
                    </View>
                    <RadioButton.Android
                      value={status}
                      status={isSelected ? 'checked' : 'unchecked'}
                      onPress={() => setSelectedStatus(status)}
                      color={theme.colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Cancelled Divider & Section */}
            {showCancelledOption && (
              <>
                <View style={styles.dividerRow}>
                  <Divider style={{ flex: 1 }} />
                  <Text variant="labelSmall" style={[styles.dividerText, { color: theme.colors.subtext }]}>OR</Text>
                  <Divider style={{ flex: 1 }} />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedStatus('Cancelled')}
                    style={[
                    styles.optionCard,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: selectedStatus === 'Cancelled' ? theme.colors.error : theme.colors.border,
                      borderWidth: selectedStatus === 'Cancelled' ? 2 : 1
                    }
                  ]}
                >
                  <View style={styles.optionContent}>
                    <Avatar.Icon 
                      size={36} 
                      icon={STATUS_ICONS['Cancelled']} 
                      style={{ backgroundColor: STATUS_COLORS['Cancelled'].bg }} 
                      color={STATUS_COLORS['Cancelled'].text} 
                    />
                    <View style={styles.optionText}>
                      <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.error }}>
                        Cancelled
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
                        {STATUS_DESCRIPTIONS['Cancelled']}
                      </Text>
                    </View>
                    <RadioButton.Android
                      value="Cancelled"
                      status={selectedStatus === 'Cancelled' ? 'checked' : 'unchecked'}
                      onPress={() => setSelectedStatus('Cancelled')}
                      color={theme.colors.error}
                    />
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* Notes Annotation Form */}
            <View style={styles.notesContainer}>
              <Text variant="titleMedium" style={styles.notesTitle}>
                Update Commentary Note
              </Text>
              <TextInput
                label="Add a note (optional)"
                placeholder="E.g. Passenger reached gate 14, assistance provided"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                maxLength={200}
                style={[styles.textInput, { backgroundColor: theme.colors.surface }]}
                mode="outlined"
              />
              <Text variant="bodySmall" style={[styles.counter, { color: theme.colors.placeholder }]}>
                {note.length}/200
              </Text>
            </View>

            {/* Footer buttons */}
            <Button
              mode="contained"
              disabled={!selectedStatus || submitting}
              loading={submitting}
              onPress={handleUpdate}
              style={styles.actionBtn}
            >
              Update Status
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Confirmation portal dialogs */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Confirm Status Update</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to transition request status from <Text style={{ fontWeight: 'bold' }}>{request.status}</Text> to <Text style={{ fontWeight: 'bold', color: selectedStatus === 'Cancelled' ? theme.colors.error : theme.colors.primary }}>{selectedStatus}</Text>?
            </Text>
            {note.trim() ? (
              <View style={[styles.previewNote, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.placeholder, fontWeight: 'bold' }}>Note Preview:</Text>
                <Text variant="bodyMedium" style={{ fontStyle: 'italic', marginTop: 4 }}>
                  "{note.trim()}"
                </Text>
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleConfirmUpdate} style={{ fontWeight: 'bold' }}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Feedback message snacker */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    paddingBottom: 40,
  },
  summaryCard: {
    margin: 16,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  terminalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  terminalText: {
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  goBackBtn: {
    marginTop: 24,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  optionCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 1,
  },
  assignBtn: {
    borderRadius: 8,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerText: {
    fontWeight: 'bold',
    marginHorizontal: 10,
    fontSize: 11,
  },
  notesContainer: {
    marginTop: 14,
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 14,
  },
  counter: {
    textAlign: 'right',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  actionBtn: {
    marginTop: 20,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewNote: {
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
  },
});
