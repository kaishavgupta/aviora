import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Expo Notifications handler could not be set. This is expected in Expo Go SDK 53+ for Android:', e.message);
}

/**
 * Returns a short title string for each request status.
 * 
 * @param {string} status - The request status.
 * @returns {string} The notification title.
 */
export const getNotificationTitle = (status) => {
  switch (status) {
    case 'New Request':
      return 'Request Submitted ✈️';
    case 'Under Review':
      return 'Request Under Review 🔍';
    case 'Staff Assigned':
      return 'Staff Assigned to You 👤';
    case 'Passenger Contacted':
      return 'Our Staff Will Contact You 📞';
    case 'Assistance In Progress':
      return 'Assistance Started 🚀';
    case 'Completed':
      return 'Assistance Completed ✅';
    case 'Cancelled':
      return 'Request Cancelled ❌';
    default:
      return 'Request Update';
  }
};

/**
 * Returns a full sentence body for each request status using the passenger's name.
 * 
 * @param {string} status - The request status.
 * @param {string} passengerName - The passenger's name.
 * @returns {string} The notification body text.
 */
export const getNotificationBody = (status, passengerName) => {
  const name = passengerName || 'Passenger';
  switch (status) {
    case 'New Request':
      return `Hi ${name}, your assistance request has been received.`;
    case 'Under Review':
      return `Hi ${name}, our team is reviewing your request.`;
    case 'Staff Assigned':
      return `Hi ${name}, a staff member has been assigned to assist you.`;
    case 'Passenger Contacted':
      return `Hi ${name}, our staff will reach out to you shortly.`;
    case 'Assistance In Progress':
      return `Hi ${name}, your assistance is currently in progress.`;
    case 'Completed':
      return `Hi ${name}, your assistance has been completed. Thank you!`;
    case 'Cancelled':
      return `Hi ${name}, your request has been cancelled.`;
    default:
      return `Hi ${name}, your request status has been updated.`;
  }
};

/**
 * Schedules a local push notification using expo-notifications.
 * Safely requests permission and fails silently if denied.
 * 
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @returns {Promise<void>}
 */
export const scheduleLocalPushNotification = async (title, body) => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      // Fail silently without crashing the app if user denied notifications
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error scheduling local notification:', error);
  }
};

/**
 * Creates a notification document in Firestore and triggers a local push alert.
 * 
 * @param {string} userId - UID of the passenger.
 * @param {string} requestId - The request document ID.
 * @param {string} status - The current status of the request.
 * @param {string} passengerName - The passenger's name.
 * @returns {Promise<void>}
 */
export const createNotification = async (userId, requestId, status, passengerName) => {
  try {
    const title = getNotificationTitle(status);
    const body = getNotificationBody(status, passengerName);

    // Save notification in Firestore subcollection '/notifications/{userId}/items/{auto-id}'
    const notificationsCol = collection(db, 'notifications', userId, 'items');
    await addDoc(notificationsCol, {
      title,
      body,
      requestId,
      status,
      read: false,
      createdAt: serverTimestamp(),
    });

    // Schedule local push notification instantly
    await scheduleLocalPushNotification(title, body);
  } catch (error) {
    console.error('Error writing notification to Firestore:', error);
    throw new Error('Failed to record notification.');
  }
};

/**
 * Subscribes to real-time notification updates for a specific user.
 * 
 * @param {string} userId - UID of the user.
 * @param {Function} onUpdate - Callback triggered with notifications array on any change.
 * @param {Function} onError - Callback invoked if subscription fails.
 * @returns {Function} Unsubscribe function.
 */
export const subscribeToNotifications = (userId, onUpdate, onError) => {
  const notificationsCol = collection(db, 'notifications', userId, 'items');
  const q = query(notificationsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({
          ...doc.data(),
          id: doc.id,
        });
      });
      onUpdate(notifications);
    },
    (error) => {
      console.error(`Error in notifications listener for ${userId}:`, error);
      if (onError) onError(error);
    }
  );
};

/**
 * Marks a single notification document as read.
 * 
 * @param {string} userId - UID of the user.
 * @param {string} notificationId - The notification document ID.
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to update notification status.');
  }
};

/**
 * Fetches all unread notifications for a user and marks them as read in a batch write.
 * 
 * @param {string} userId - UID of the user.
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsCol = collection(db, 'notifications', userId, 'items');
    const q = query(notificationsCol, where('read', '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      const notificationRef = doc(db, 'notifications', userId, 'items', docSnap.id);
      batch.update(notificationRef, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to clear unread notifications.');
  }
};

/**
 * One-time query to count the number of unread notifications for a user.
 * 
 * @param {string} userId - UID of the user.
 * @returns {Promise<number>} Number of unread notifications.
 */
export const getUnreadCount = async (userId) => {
  try {
    const notificationsCol = collection(db, 'notifications', userId, 'items');
    const q = query(notificationsCol, where('read', '==', false));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    throw new Error('Failed to fetch unread badge counts.');
  }
};
