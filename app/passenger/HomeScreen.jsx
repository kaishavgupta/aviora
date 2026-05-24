import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Text, Card, Button, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { getPassengerRequests } from '../../services/requestService';
import RequestCard from '../../components/RequestCard';

/**
 * Helper to determine time-based greeting.
 * 
 * @returns {string} Time-appropriate greeting string.
 */
const getGreeting = () => {
  const hrs = new Date().getHours();
  if (hrs < 12) return 'Good Morning';
  if (hrs < 18) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * HomeScreen component.
 * Acts as the primary dashboard for passengers.
 * Features time-based greeting, real-time statistics counters, 2x2 quick action keys,
 * recent requests summary list, skeleton loaders, and a "View All" details view.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @param {Object} props.route - Route state and parameters.
 * @returns {React.JSX.Element} HomeScreen layout.
 */
export default function HomeScreen({ navigation, route }) {
  const theme = useTheme();
  const { userProfile, user } = useAuthStore();
  const { requests, setRequests } = useRequestStore();

  const [loading, setLoading] = useState(true);
  
  // Read route parameter to toggle between dashboard and full request list
  const viewAllMode = !!route.params?.viewAll;

  // Real-time snapshot listener subscription
  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = getPassengerRequests(user.uid, (data) => {
      setRequests(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, setRequests]);

  // Derived counts for Stats cards
  const totalRequests = requests.length;
  const activeRequestsList = requests.filter(
    (req) => req.status !== 'Completed' && req.status !== 'Cancelled'
  );
  const activeRequests = activeRequestsList.length;
  const completedRequests = requests.filter((req) => req.status === 'Completed').length;

  // Filter requests for list rendering (recent 3 in dashboard, all in viewAllMode)
  const listData = viewAllMode ? requests : requests.slice(0, 3);

  // Time based greeting message
  const greeting = getGreeting();
  const passengerName = userProfile?.name || 'Passenger';

  // Render a skeleton loader card
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.surface }]} />
      ))}
    </View>
  );

  // Header component for requests flatlist in viewAllMode
  const renderListHeader = () => {
    if (viewAllMode) {
      return (
        <View style={styles.viewAllHeader}>
          <TouchableOpacity 
            onPress={() => navigation.setParams({ viewAll: undefined })}
            style={styles.backLink}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.primary} />
            <Text variant="labelLarge" style={{ color: theme.colors.primary, marginLeft: 4, fontWeight: 'bold' }}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
          <Text variant="headlineSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            All Assistance Requests ({requests.length})
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.dashboardWrapper}>
        {/* Greetings Panel */}
        <View style={styles.greetingContainer}>
          <View style={styles.greetingLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="headlineSmall" style={[styles.greetingText, { color: theme.colors.subtext }] }>
                {greeting},
              </Text>
              <MaterialCommunityIcons name="airplane" size={24} color={theme.colors.secondary} style={styles.planeIcon} />
            </View>
            <Text variant="titleLarge" style={[styles.nameText, { color: theme.colors.primary }]}>
              {passengerName}
            </Text>
          </View>

        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineMedium" style={[styles.statNum, { color: theme.colors.primary }]}>
                {totalRequests}
              </Text>
              <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.subtext }]}>Total</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineMedium" style={[styles.statNum, { color: theme.colors.secondary }]}>
                {activeRequests}
              </Text>
              <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.subtext }]}>Active</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text variant="headlineMedium" style={[styles.statNum, { color: theme.colors.success }]}>
                {completedRequests}
              </Text>
              <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.subtext }]}>Done</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions Grid (2 columns, 2 rows) */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          What do you need?
        </Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('AddTrip')}
          >
            <MaterialCommunityIcons name="airplane-takeoff" size={32} color={theme.colors.primary} />
            <Text variant="labelLarge" style={[styles.gridLabel, { color: theme.colors.primary }]}>
              New Request
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('RequestTracking')}
          >
            <MaterialCommunityIcons name="radar" size={32} color={theme.colors.primary} />
            <Text variant="labelLarge" style={[styles.gridLabel, { color: theme.colors.primary }]}>
              Track Request
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.gridContainer, { marginTop: 12 }]}>
          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={32} color={theme.colors.primary} />
            <Text variant="labelLarge" style={[styles.gridLabel, { color: theme.colors.primary }]}>
              Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialCommunityIcons name="account-outline" size={32} color={theme.colors.primary} />
            <Text variant="labelLarge" style={[styles.gridLabel, { color: theme.colors.primary }]}>
              My Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* My Active Requests Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 24 }]}>
          My Active Requests
        </Text>
        {activeRequestsList.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {activeRequestsList.map((item) => (
              <View key={item.requestId} style={{ width: 280, marginRight: 12 }}>
                <RequestCard 
                  request={item} 
                  onPress={() => navigation.navigate('RequestTracking', { requestId: item.requestId })} 
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Card style={[styles.emptyActiveCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} elevation={1}>
            <Card.Content style={styles.emptyActiveContent}>
              <MaterialCommunityIcons name="check-decagram-outline" size={24} color={theme.colors.success} style={{ marginRight: 8 }} />
              <Text variant="bodyMedium" style={[styles.emptyActiveText, { color: theme.colors.subtext }]}>
                No active assistance requests at the moment.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Recent Requests Title Section */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Requests
          </Text>
          {requests.length > 3 && (
            <TouchableOpacity onPress={() => navigation.setParams({ viewAll: true })}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                View All ({requests.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Empty list view template
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="airplane-landing" size={80} color={theme.colors.outline} />
      <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.placeholder }]}>
        No assistance requests yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.placeholder }]}>
        Aviora makes travel simple. Register a flight to book special assistance.
      </Text>
      <Button 
        mode="contained" 
        onPress={() => navigation.navigate('AddTrip')}
        style={styles.emptyBtn}
        icon="plus"
      >
        Submit Your First Request
      </Button>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        // Loading state
        <View style={{ flex: 1 }}>
          {viewAllMode ? null : renderListHeader()}
          {renderSkeleton()}
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.requestId}
          renderItem={({ item }) => (
            <RequestCard 
              request={item} 
              onPress={() => navigation.navigate('RequestTracking', { requestId: item.requestId })} 
            />
          )}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.scrollContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  dashboardWrapper: {
    width: '100%',
  },
  viewAllHeader: {
    marginBottom: 16,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  greetingLeft: {
    flexDirection: 'column',
  },
  greetingText: {
    fontWeight: 'normal',
    color: '#64748B',
  },
  planeIcon: {
    marginLeft: 6,
    transform: [{ rotate: '30deg' }],
  },
  nameText: {
    fontWeight: 'bold',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 0.31,
    borderRadius: 8,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  statNum: {
    fontWeight: 'bold',
  },
  statLabel: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 0.48,
    height: 90,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridLabel: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  emptyBtn: {
    borderRadius: 8,
  },
  skeletonContainer: {
    marginTop: 8,
  },
  skeletonCard: {
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    opacity: 0.6,
  },
  horizontalScrollContent: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  emptyActiveCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  emptyActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyActiveText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
