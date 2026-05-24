import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Chip, useTheme, IconButton, FAB, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Store & Service Imports
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { getAllRequestsListener, getStaffRequestsListener } from '../../services/requestService';
import RequestCard from '../../components/RequestCard';
import { STATUS_LIST } from '../../constants/statusFlow';

/**
 * RequestListScreen component.
 * Renders the main dashboard for staff and administrators.
 * Features keyword search bars, status selection row chips, list indicators,
 * real-time firebase state synchronizations, and floating manually refresh buttons.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} RequestListScreen layout.
 */
export default function RequestListScreen({ navigation }) {
  const theme = useTheme();
  const { userProfile, user } = useAuthStore();
  const { allRequests, setAllRequests, addUnsubscribe, cleanupListeners } = useRequestStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [showMyCompleted, setShowMyCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const staffName = userProfile?.name || 'Staff Member';
  const isStaff = userProfile?.role === 'staff';
  const isAdmin = userProfile?.role === 'admin';

  // Customize headers dynamically
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={{ marginLeft: 16 }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
            Aviora Workspace
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimary + 'D0', fontSize: 11 }}>
            Hello, {staffName}
          </Text>
        </View>
      ),
      headerRight: () => (
        <IconButton 
          icon="bell-outline"
          iconColor={theme.colors.onPrimary}
          size={24}
          onPress={() => navigation.navigate('Notifications')}
        />
      ),
      headerTitle: () => null,
    });
  }, [navigation, staffName, theme]);

  // Real-time snapshot listener subscription
  const startRequestsListener = () => {
    setLoading(true);
    const listener = isStaff && user?.uid
      ? getStaffRequestsListener
      : getAllRequestsListener;
    const unsubscribe = isStaff && user?.uid ? listener(user.uid, (data) => {
      setAllRequests(data);
      setLoading(false);
    }) : listener((data) => {
      setAllRequests(data);
      setLoading(false);
    });
    addUnsubscribe(unsubscribe);
  };

  useEffect(() => {
    startRequestsListener();
    return () => {
      cleanupListeners();
    };
  }, [isStaff, user?.uid]);

  useEffect(() => {
    if (isStaff) {
      setAssignedFilter('AssignedToMe');
    }
  }, [isStaff]);

  // Filter requests based on status filter and search query (AND logic)
  const filteredRequests = allRequests.filter((req) => {
    // 1. Status Filter
    const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;

    // 2. Search Query (Passenger Name, Flight, or PNR)
    const queryStr = searchQuery.toLowerCase().trim();
    const matchesSearch = !queryStr ||
      (req.passengerName || '').toLowerCase().includes(queryStr) ||
      (req.pnr || '').toLowerCase().includes(queryStr) ||
      (req.flightNumber || '').toLowerCase().includes(queryStr);

    // 3. Staff Completed Filter
    const matchesCompletedByMe = !showMyCompleted || (
      user?.uid &&
      req.assignedStaff?.uid === user.uid &&
      req.status === 'Completed'
    );

    const staffCanSeeRequest = !isStaff || req.assignedStaff?.uid === user?.uid;
    const matchesAssignedFilter = isStaff ||
      assignedFilter === 'All' ||
      (assignedFilter === 'AssignedToMe' && req.assignedStaff?.uid === user?.uid) ||
      (assignedFilter === 'Unassigned' && !req.assignedStaff);

    return staffCanSeeRequest && matchesStatus && matchesSearch && matchesCompletedByMe && matchesAssignedFilter;
  });

  // Action to trigger manual fetch
  const handleManualRefresh = () => {
    cleanupListeners();
    startRequestsListener();
  };

  // Render loading skeleton layout
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} />
      ))}
    </View>
  );

  // Render empty state layouts
  const renderEmptyState = () => {
    if (allRequests.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-alert-outline" size={64} color={theme.colors.outline} />
          <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.placeholder }]}>
            No requests yet
          </Text>
          <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.placeholder }]}>
            Passenger requests will list here once submitted to the system.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="magnify-close" size={64} color={theme.colors.outline} />
        <Text variant="titleLarge" style={[styles.emptyTitle, { color: theme.colors.placeholder }]}>
          No matching records
        </Text>
        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.placeholder }]}>
          No assistance requests match your search filters. Try adjusting them.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by Passenger, PNR, Flight..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {isAdmin && (
        <View style={styles.adminActionRow}>
          <Button
            mode="contained"
            icon="account-plus"
            onPress={() => navigation.navigate('OnboardPassenger')}
            style={styles.onboardButton}
          >
            Onboard Passenger
          </Button>
        </View>
      )}

      {isAdmin && (
        <View style={styles.assignedFilterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Chip
              selected={assignedFilter === 'All'}
              onPress={() => setAssignedFilter('All')}
              style={styles.chip}
              mode={assignedFilter === 'All' ? 'flat' : 'outlined'}
              selectedColor={assignedFilter === 'All' ? theme.colors.onPrimary : theme.colors.primary}
              showSelectedOverlay
            >
              All Requests
            </Chip>
            <Chip
              selected={assignedFilter === 'AssignedToMe'}
              onPress={() => setAssignedFilter('AssignedToMe')}
              style={styles.chip}
              mode={assignedFilter === 'AssignedToMe' ? 'flat' : 'outlined'}
              selectedColor={assignedFilter === 'AssignedToMe' ? theme.colors.onPrimary : theme.colors.primary}
              showSelectedOverlay
            >
              My Tasks
            </Chip>
            <Chip
              selected={assignedFilter === 'Unassigned'}
              onPress={() => setAssignedFilter('Unassigned')}
              style={styles.chip}
              mode={assignedFilter === 'Unassigned' ? 'flat' : 'outlined'}
              selectedColor={assignedFilter === 'Unassigned' ? theme.colors.onPrimary : theme.colors.primary}
              showSelectedOverlay
            >
              Unassigned
            </Chip>
          </ScrollView>
        </View>
      )}

      {/* Filter Chips Horizontal Scroll */}
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Chip
            selected={selectedStatus === 'All'}
            onPress={() => setSelectedStatus('All')}
            style={styles.chip}
            mode={selectedStatus === 'All' ? 'flat' : 'outlined'}
            selectedColor={selectedStatus === 'All' ? theme.colors.onPrimary : theme.colors.primary}
            showSelectedOverlay
          >
            All
          </Chip>
          {STATUS_LIST.map((status) => (
            <Chip
              key={status}
              selected={selectedStatus === status}
              onPress={() => {
                setSelectedStatus(status);
                if (showMyCompleted && status !== 'Completed') {
                  setShowMyCompleted(false);
                }
              }}
              style={styles.chip}
              mode={selectedStatus === status ? 'flat' : 'outlined'}
              selectedColor={selectedStatus === status ? theme.colors.onPrimary : theme.colors.primary}
              showSelectedOverlay
            >
              {status}
            </Chip>
          ))}
          <Chip
            selected={showMyCompleted}
            onPress={() => {
              const next = !showMyCompleted;
              setShowMyCompleted(next);
              if (next) {
                setSelectedStatus('Completed');
              }
            }}
            style={styles.chip}
            mode={showMyCompleted ? 'flat' : 'outlined'}
            selectedColor={showMyCompleted ? theme.colors.onPrimary : theme.colors.primary}
            showSelectedOverlay
          >
            My Completed
          </Chip>
        </ScrollView>
      </View>

      {/* Request List */}
      <View style={styles.listContainer}>
        <Text variant="labelLarge" style={[styles.countText, { color: theme.colors.placeholder }]}>
          Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </Text>

        {loading ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.requestId}
            renderItem={({ item }) => (
              <RequestCard 
                request={item} 
                onPress={() => navigation.navigate('RequestDetail', { requestId: item.requestId })} 
              />
            )}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listScroll}
          />
        )}
      </View>

      {/* Manual Refresh FAB */}
      <FAB
        icon="refresh"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleManualRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 8,
    elevation: 2,
    height: 48,
  },
  filterWrapper: {
    height: 48,
  },
  assignedFilterWrapper: {
    minHeight: 52,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  adminActionRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  onboardButton: {
    borderRadius: 8,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    marginRight: 8,
    height: 32,
    borderRadius: 16,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  countText: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  listScroll: {
    paddingBottom: 80,
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
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  skeletonContainer: {
    paddingTop: 4,
  },
  skeletonCard: {
    height: 110,
    borderRadius: 12,
    marginBottom: 12,
    opacity: 0.3,
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 10,
    borderRadius: 28,
  },
});
