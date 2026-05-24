import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Alert, RefreshControl, TouchableHighlight } from 'react-native';
import { Text, Divider, Button, Avatar, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Service & Store Imports
import { 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useRequestStore } from '../../store/requestStore';
import { STATUS_COLORS, STATUS_ICONS } from '../../constants/statusFlow';

/**
 * Converts a Firestore Timestamp to a relative date-time text.
 * 
 * @param {any} ts - Firestore Timestamp or ISO Date string.
 * @returns {string} Human readable relative timeframe.
 */
export const getRelativeTime = (ts) => {
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

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateObj.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * NotificationsScreen component.
 * Lists operational request updates sent to the user.
 * Supports marking logs as read individually or collectively, relative timing descriptions,
 * skeleton state animations, pull-to-refresh queries, and long-press item deletions.
 * 
 * @param {Object} props - React Navigation props.
 * @param {Object} props.navigation - Navigation controller.
 * @returns {React.JSX.Element} NotificationsScreen layout.
 */
export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { setUnreadCount } = useRequestStore();

  // Screen states
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Toast notifications
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // Subscribe to real-time notification records
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoading(true);
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (data) => {
        setNotifications(data);
        const unreadList = data.filter((n) => !n.read);
        setUnreadCount(unreadList.length);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error in notifications subscription:', err);
        setIsLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, setUnreadCount]);

  // Configure "Mark All Read" action button dynamically on the header
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => 
        unreadCount > 0 ? (
          <Button 
            mode="text" 
            textColor={theme.colors.onPrimary}
            onPress={handleMarkAllRead}
            labelStyle={{ fontWeight: 'bold' }}
          >
            Mark All Read
          </Button>
        ) : null
    });
  }, [navigation, unreadCount, theme.colors.onPrimary]);

  /**
   * Invokes notification service to batch-mark all alerts read.
   */
  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (err) {
      setSnackbarMsg('Failed to update notifications.');
      setSnackbarVisible(true);
    }
  };

  /**
   * Performs a single fetch to reload lists on pull-to-refresh gestures.
   */
  const handleRefresh = async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const q = query(
        collection(db, 'notifications', user.uid, 'items'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = [];
      snapshot.forEach((docSnap) => {
        data.push({ ...docSnap.data(), id: docSnap.id });
      });
      setNotifications(data);
      const unreadList = data.filter((n) => !n.read);
      setUnreadCount(unreadList.length);
    } catch (err) {
      console.error('Error refreshing notifications:', err);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Triggers a read marker updates and navigates to the request progress tracker.
   * 
   * @param {Object} item - Notification document data.
   */
  const handleSelectNotification = async (item) => {
    if (!user?.uid) return;

    try {
      // Mark as read if currently unread
      if (!item.read) {
        await markNotificationAsRead(user.uid, item.id);
      }

      // Navigate to tracking if request reference ID exists
      if (item.requestId) {
        navigation.navigate('RequestTracking', { requestId: item.requestId });
      }
    } catch (err) {
      console.error('Error selecting notification:', err);
    }
  };

  /**
   * Deletes a notification from Firestore.
   * 
   * @param {string} notificationId - Doc ID.
   */
  const handleDeleteNotification = async (notificationId) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'notifications', user.uid, 'items', notificationId));
      setSnackbarMsg('Notification deleted.');
      setSnackbarVisible(true);
    } catch (err) {
      setSnackbarMsg('Could not delete notification.');
      setSnackbarVisible(true);
    }
  };

  /**
   * Triggers warning Alert on item long presses to allow deletion.
   * 
   * @param {Object} item - Notification document.
   */
  const handleLongPressNotification = (item) => {
    Alert.alert(
      'Delete Alert Log',
      'Are you sure you want to delete this notification record from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => handleDeleteNotification(item.id) 
        }
      ]
    );
  };

  // Render list divider lines
  const renderSeparator = () => <Divider style={styles.divider} />;

  // Render dummy skeleton rows while initial fetch executes
  const renderSkeletonList = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonTextWrapper}>
            <View style={styles.skeletonTitleLine} />
            <View style={styles.skeletonBodyLine} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render empty placeholder list
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={60} color={theme.colors.outline} />
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.placeholder }]}>
        No notifications yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.placeholder }]}>
        You'll be notified here when your assistance requests change status.
      </Text>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        renderSkeletonList()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusStyle = STATUS_COLORS[item.status] || { bg: theme.colors.surface, text: theme.colors.subtext };
            const statusIcon = STATUS_ICONS[item.status] || 'bell-outline';

            return (
              <TouchableHighlight
                underlayColor={theme.colors.primary + '0A'}
                onPress={() => handleSelectNotification(item)}
                onLongPress={() => handleLongPressNotification(item)}
                style={[
                  styles.notificationItem,
                  { backgroundColor: item.read ? 'transparent' : theme.colors.primary + '05' }
                ]}
              >
                <View style={styles.itemRow}>
                  {/* Left Icon Node */}
                  <Avatar.Icon
                    size={40}
                    icon={statusIcon}
                    style={{
                      backgroundColor: item.read 
                        ? theme.colors.outline + '20' 
                        : theme.colors.primary + '15',
                    }}
                    color={item.read ? theme.colors.subtext : theme.colors.primary}
                  />

                  {/* Middle Text Details */}
                  <View style={styles.textWrapper}>
                    <Text 
                      variant="bodyLarge" 
                      style={[
                        styles.itemTitle, 
                        { 
                          fontWeight: '700',
                          color: theme.colors.subtext,
                        }
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text 
                      variant="bodyMedium" 
                      style={[styles.itemBody, { color: theme.colors.subtext }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <Text variant="bodySmall" style={[styles.timeText, { color: theme.colors.subtext }]}>
                      {getRelativeTime(item.createdAt)}
                    </Text>
                  </View>

                  {/* Right Unread indicator dot */}
                  {!item.read && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.colors.secondary }]} />
                  )}
                </View>
              </TouchableHighlight>
            );
          }}
        />
      )}

      {/* Error alert toast */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: 'Dismiss', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  divider: {
    height: 1,
  },
  notificationItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 15,
  },
  itemBody: {
    marginTop: 2,
    fontSize: 13,
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    opacity: 0.6,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonTextWrapper: {
    flex: 1,
    marginLeft: 14,
  },
  skeletonTitleLine: {
    height: 14,
    width: '40%',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonBodyLine: {
    height: 12,
    width: '85%',
    borderRadius: 4,
  },
});
