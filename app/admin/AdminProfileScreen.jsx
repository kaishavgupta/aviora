import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Avatar, Switch, useTheme, Card, Snackbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

// Store & Service Imports
import { auth } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { getStaffProfile, setStaffAvailability } from '../../services/staffService';

/**
 * Returns initials from name.
 * 
 * @param {string} name - Staff name.
 * @returns {string} Initials.
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
 * AdminProfileScreen component.
 * Displays user credentials, allows toggling staff availability, and logs out user.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} AdminProfileScreen layout.
 */
export default function AdminProfileScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile, clearUser } = useAuthStore();
  const allRequests = useRequestStore((state) => state.allRequests);

  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Fetch staff profile to synchronize availability switch
  const fetchProfile = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getStaffProfile(user.uid);
      setStaffData(data);
    } catch (err) {
      console.error('Error fetching staff profile in screen:', err);
      // Fallback to userProfile if /staff doc is missing
      setStaffData({
        name: userProfile?.name || 'Staff Member',
        email: userProfile?.email || '',
        mobile: userProfile?.mobile || '',
        available: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Handle availability toggle Switch changes
  const handleToggleAvailability = async () => {
    if (!user?.uid || !staffData) return;
    setToggling(true);
    const nextVal = !staffData.available;
    try {
      await setStaffAvailability(user.uid, nextVal);
      setStaffData((prev) => ({ ...prev, available: nextVal }));
      setSnackbarMsg(`Availability marked as ${nextVal ? 'Available' : 'Unavailable'}`);
      setSnackbarVisible(true);
    } catch (err) {
      console.error('Error toggling availability:', err);
      setSnackbarMsg('Failed to update availability status.');
      setSnackbarVisible(true);
    } finally {
      setToggling(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearUser();
      // Mark that we should show Login next time unauthenticated state renders
      useAuthStore.getState().logoutUser();
    } catch (err) {
      console.error('Sign out error:', err);
      setSnackbarMsg('Failed to sign out. Please try again.');
      setSnackbarVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const profileName = staffData?.name || userProfile?.name || 'Staff Member';
  const initials = getInitials(profileName);

  const completedByMeCount = allRequests.filter(
    (req) => req.assignedStaff?.uid === user?.uid && req.status === 'Completed'
  ).length;

  const activeAssignedCount = allRequests.filter(
    (req) => req.assignedStaff?.uid === user?.uid && req.status !== 'Completed' && req.status !== 'Cancelled'
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Summary */}
        <Card style={styles.profileCard} elevation={1}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Text 
              size={64} 
              label={initials} 
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
            <Text variant="headlineSmall" style={styles.profileName}>
              {profileName}
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {(userProfile?.role || 'staff').toUpperCase()}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Account Details Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="card-account-details-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Account Details
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{staffData?.email || user?.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile Phone</Text>
              <Text style={styles.detailValue}>{staffData?.mobile || userProfile?.mobile || 'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Completed Request Summary */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                Your Request Summary
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statsBlock}>
                <Text style={[styles.statsLabel, { color: theme.colors.subtext }]}>Assigned Active</Text>
                <Text variant="headlineSmall" style={styles.statsValue}>{activeAssignedCount}</Text>
              </View>
              <View style={styles.statsBlock}>
                <Text style={[styles.statsLabel, { color: theme.colors.subtext }]}>Completed</Text>
                <Text variant="headlineSmall" style={styles.statsValue}>{completedByMeCount}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Availability Card */}
        {userProfile?.role === 'staff' && (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="clock-check-outline" size={20} color={theme.colors.primary} />
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Duty Status
                </Text>
              </View>
              
              <View style={styles.switchRow}>
                <View style={styles.switchTextWrapper}>
                  <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                    Available for Assist Duties
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.placeholder, marginTop: 2 }}>
                    Toggling active displays your profile on passenger allocations lists.
                  </Text>
                </View>
                {toggling ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 10 }} />
                ) : (
                  <Switch
                    value={!!staffData?.available}
                    onValueChange={handleToggleAvailability}
                    color={theme.colors.primary}
                  />
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Log Out Button */}
        <Button
          mode="contained"
          style={[styles.logoutBtn, { backgroundColor: theme.colors.error }]}
          textColor="#FFFFFF"
          icon="logout"
          onPress={handleLogout}
        >
          Sign Out of Aviora
        </Button>
      </ScrollView>

      {/* Snackbar alerting notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
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
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    borderRadius: 8,
    marginBottom: 14,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileName: {
    fontWeight: 'bold',
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 8,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextWrapper: {
    flex: 1,
    paddingRight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statsBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statsLabel: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  statsValue: {
    fontWeight: 'bold',
  },
  logoutBtn: {
    marginTop: 14,
    borderRadius: 8,
    paddingVertical: 4,
  },
});
