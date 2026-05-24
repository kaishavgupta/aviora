import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Avatar, Card, useTheme, List, Switch, Divider, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

// Store & Service Imports
import { auth } from '../../services/firebase';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';


/**
 * Returns initials from name.
 * 
 * @param {string} name - Passenger name.
 * @returns {string} Initials.
 */
const getInitials = (name) => {
  if (!name) return 'PA';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * ProfileScreen component.
 * Displays passenger profile details, app configurations, and handles sign-out.
 * 
 * @returns {React.JSX.Element} The ProfileScreen component.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user, userProfile, clearUser } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMsg, setSnackbarMsg] = React.useState('');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearUser();
      useAuthStore.getState().logoutUser();
    } catch (err) {
      console.error('Sign out error:', err);
      setSnackbarMsg('Failed to sign out. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const passengerName = userProfile?.name || 'Passenger';
  const initials = getInitials(passengerName);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Summary */}
        <Card style={styles.profileCard} elevation={1}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Text 
              size={72} 
              label={initials} 
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
            <Text variant="headlineSmall" style={styles.profileName}>
              {passengerName}
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                {(userProfile?.role || 'passenger').toUpperCase()}
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
              <Text style={styles.detailValue}>{userProfile?.email || user?.email || 'N/A'}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile Phone</Text>
              <Text style={styles.detailValue}>{userProfile?.mobile || 'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Settings Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>
                App Settings
              </Text>
            </View>

            <List.Item
              title="Push Notifications"
              description="Mock alerts for request status shifts"
              left={props => <List.Icon {...props} icon="bell-ring-outline" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  color={theme.colors.primary}
                />
              )}
              style={styles.listItem}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Dark Mode"
              description={isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
              left={props => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
              style={styles.listItem}
            />
            <Button
              mode="contained"
              onPress={toggleTheme}
              style={styles.actionButton}
              textColor={theme.colors.onPrimary}
              color={theme.colors.primary}
            >
              Toggle Theme
            </Button> <Divider style={styles.divider} />

            <List.Item
              title="App Version"
              description="v1.0.0 (SDK 54)"
              left={props => <List.Icon {...props} icon="information-outline" />}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

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
    paddingVertical: 6,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 10,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  logoutBtn: {
    marginTop: 14,
    borderRadius: 8,
    paddingVertical: 4,
  },
});
