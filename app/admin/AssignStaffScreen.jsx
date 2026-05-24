import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar, useTheme, ActivityIndicator, Snackbar, Portal, Dialog, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { getRequestById, getAvailableStaff, assignStaffToRequest } from '../../services/requestService';

/**
 * Returns the initials of a name for avatar fallback display.
 * 
 * @param {string} name - The staff member name.
 * @returns {string} Staff initials (e.g. "RS").
 */
const getInitials = (name) => {
  if (!name) return 'ST';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * AssignStaffScreen component.
 * Allows staff to allocate an active assistance request to an available support member.
 * Displays warning alerts if request is completed/cancelled, fetches available personnel,
 * highlights selections, and handles confirmation dialogs and snackbar feedback.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.route - Route state and parameters.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} AssignStaffScreen layout.
 */
export default function AssignStaffScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const theme = useTheme();
  const { userProfile } = useAuthStore();
  const isAdmin = userProfile?.role === 'admin';

  // Screen states
  const [request, setRequest] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // Interaction states
  const [dialogVisible, setDialogVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Fetch Request & Staff list on mount
  const loadData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (requestId) {
        const reqData = await getRequestById(requestId);
        setRequest(reqData);
      }
      const availableStaff = await getAvailableStaff();
      setStaffList(availableStaff);
    } catch (err) {
      console.error('Error loading staff selection data:', err);
      setSnackbarMsg('Failed to load screen data.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestId, isAdmin]);

  // Handle assignment trigger
  const handleAssign = () => {
    if (!selectedStaff) return;
    setDialogVisible(true);
  };

  // Perform Firestore updates on Dialog confirmation
  const handleConfirmAssignment = async () => {
    setDialogVisible(false);
    if (!selectedStaff || !request) return;

    setSubmitting(true);
    try {
      const assignedByName = userProfile?.name || 'Staff Member';
      // Call service method: assignStaffToRequest(requestId, staffMember, passengerId, assignedByName)
      await assignStaffToRequest(requestId, selectedStaff, request.userId, assignedByName);
      
      setSnackbarMsg(`Assigned to ${selectedStaff.name} successfully!`);
      setSnackbarVisible(true);
      
      // Delay pop to let user read the success alert
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error('Error assigning staff:', err);
      setSnackbarMsg(err.message || 'Failed to complete assignment.');
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const isTerminalState = request?.status === 'Completed' || request?.status === 'Cancelled';

  // Render staff selection rows
  const renderStaffItem = ({ item }) => {
    const isSelected = selectedStaff?.uid === item.uid;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedStaff(item)}
        style={[
          styles.staffCard,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          <Avatar.Text 
            size={40} 
            label={getInitials(item.name)} 
            style={{ backgroundColor: theme.colors.primary }}
            color={theme.colors.onPrimary}
          />

          {/* Details */}
          <View style={styles.textWrapper}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
              Phone: {item.mobile || 'N/A'}
            </Text>
          </View>

          {/* Right Icon / Badge indicator */}
          <View style={styles.rightWrapper}>
            <View style={[styles.badge, { backgroundColor: theme.colors.success + '10' }]}> 
              <Text style={[styles.badgeText, { color: theme.colors.success }]}>Available</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              {isSelected ? (
                <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
              ) : (
                <RadioButton.Android
                  value={item.uid}
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedStaff(item)}
                  color={theme.colors.primary}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={theme.colors.error} />
        <Text variant="headlineSmall" style={{ marginTop: 12, fontWeight: 'bold' }}>
          Admin Access Required
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center' }}>
          Only administrators can assign or reassign support staff.
        </Text>
        <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Warning banner for terminal request status */}
      {isTerminalState && (
        <View style={[styles.warningBanner, { backgroundColor: theme.colors.error + '10', borderBottomColor: theme.colors.border }]}> 
          <MaterialCommunityIcons name="alert-decagram-outline" size={20} color={theme.colors.error} />
          <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
            This request is already {request.status}. Support staff assignment may not be necessary.
          </Text>
        </View>
      )}

      {/* Header Summary Card */}
      {request && (
        <Card style={styles.summaryCard} elevation={1}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.placeholder, textTransform: 'uppercase', fontWeight: 'bold' }}>
              Selected Request
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginTop: 4 }}>
              {request.passengerName}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Assistance Type: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{request.assistanceType}</Text>
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 4 }}>
              Current Status: {request.status}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Select Support Staff Member
      </Text>

      {/* Available Staff list */}
      <View style={styles.listWrapper}>
        <FlatList
          data={staffList}
          keyExtractor={(item) => item.uid}
          renderItem={renderStaffItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off-outline" size={60} color={theme.colors.outline} />
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.placeholder }]}>
                No staff available
              </Text>
              <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.placeholder }]}>
                All staff members are currently occupied or unavailable.
              </Text>
              <Button mode="outlined" style={{ marginTop: 14 }} icon="refresh" onPress={loadData}>
                Refresh List
              </Button>
            </View>
          }
        />
      </View>

      {/* Action Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}> 
        <Button
          mode="contained"
          style={styles.confirmBtn}
          disabled={!selectedStaff || submitting}
          loading={submitting}
          onPress={handleAssign}
        >
          {selectedStaff ? `Assign to ${selectedStaff.name}` : 'Select Staff Member'}
        </Button>
      </View>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Confirm Assignment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to assign <Text style={{ fontWeight: 'bold' }}>{selectedStaff?.name}</Text> to assist <Text style={{ fontWeight: 'bold' }}>{request?.passengerName}</Text>?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleConfirmAssignment} fontWeight="bold">Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar alerts */}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  warningText: {
    marginLeft: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  staffCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  textWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  rightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});
