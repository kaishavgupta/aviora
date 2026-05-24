import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STATUS_LIST, getNextStatus } from '../constants/statusFlow';
import { createNotification } from './notificationService';
import { deleteDocument } from './uploadService';

/**
 * Generates a unique AsyncStorage key for user drafts.
 * 
 * @param {string} userId - The Firebase Auth UID of the current user.
 * @returns {string} The AsyncStorage key.
 */
export const getDraftKey = (userId) => {
  return `aviora_draft_${userId}`;
};

/**
 * Saves the current draft form inputs to AsyncStorage.
 * 
 * @param {string} userId - The user's UID.
 * @param {Object} formData - Form input values.
 * @returns {Promise<void>}
 */
export const saveRequestDraft = async (userId, formData) => {
  try {
    const key = getDraftKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(formData));
  } catch (error) {
    console.error('Error saving request draft:', error);
    throw new Error('Failed to save request draft locally.');
  }
};

/**
 * Loads a saved draft form from AsyncStorage.
 * 
 * @param {string} userId - The user's UID.
 * @returns {Promise<Object | null>} The parsed form data or null.
 */
export const loadRequestDraft = async (userId) => {
  try {
    const key = getDraftKey(userId);
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading request draft:', error);
    throw new Error('Failed to load request draft.');
  }
};

/**
 * Removes a saved draft from AsyncStorage.
 * 
 * @param {string} userId - The user's UID.
 * @returns {Promise<void>}
 */
export const clearRequestDraft = async (userId) => {
  try {
    const key = getDraftKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing request draft:', error);
    throw new Error('Failed to clear request draft.');
  }
};

/**
 * Creates a new airport assistance request in Firestore and triggers a confirmation notification.
 * 
 * @param {Object} requestData - The request details (airportName, flightNumber, travelDate, PNR, assistanceType, specialRequirements, etc.).
 * @param {string} userId - UID of the passenger making the request.
 * @param {Object} userProfile - Passenger profile details (name, email, mobile).
 * @returns {Promise<string>} The generated requestId.
 */
export const createRequest = async (requestData, userId, userProfile) => {
  try {
    const requestDocRef = doc(collection(db, 'requests'));
    const requestId = requestDocRef.id;

    const fullRequest = {
      ...requestData,
      requestId,
      userId,
      passengerName: userProfile.name,
      passengerMobile: userProfile.mobile,
      passengerEmail: userProfile.email,
      status: 'New Request',
      statusHistory: [
        {
          status: 'New Request',
          timestamp: Timestamp.now(),
          updatedBy: userId,
          note: 'Assistance request submitted by passenger.',
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignedStaff: null,
      documentUrls: requestData.documentUrls || [],
      documentPaths: requestData.documentPaths || [],
    };

    await setDoc(requestDocRef, fullRequest);

    // Write notifications through notificationService
    await createNotification(userId, requestId, 'New Request', userProfile.name);

    return requestId;
  } catch (error) {
    console.error('Error creating request in firestore:', error);
    throw new Error('Failed to submit assistance request. Please try again.');
  }
};

/**
 * Appends newly uploaded document URLs to the request's documentUrls array.
 * 
 * @param {string} requestId - The request document ID.
 * @param {Array<string|Object>} documentUrls - Uploaded URL strings or upload result objects.
 * @returns {Promise<void>}
 */
export const updateRequestDocuments = async (requestId, documentUrls = []) => {
  try {
    const requestDocRef = doc(db, 'requests', requestId);
    const requestDocSnap = await getDoc(requestDocRef);

    if (!requestDocSnap.exists()) {
      throw new Error('Request document does not exist.');
    }

    const currentData = requestDocSnap.data();
    const incomingUrls = documentUrls
      .map((item) => (typeof item === 'string' ? item : item?.downloadURL))
      .filter(Boolean);
    const incomingPaths = documentUrls
      .map((item) => (typeof item === 'string' ? null : item?.path))
      .filter(Boolean);
    const existingUrls = currentData.documentUrls || [];
    const existingPaths = currentData.documentPaths || [];
    const mergedUrls = [...existingUrls, ...incomingUrls];
    const mergedPaths = [...existingPaths, ...incomingPaths];

    await updateDoc(requestDocRef, {
      documentUrls: mergedUrls,
      documentPaths: mergedPaths,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating request document URLs:', error);
    throw new Error('Failed to update request attachments.');
  }
};

const getStoragePathFromUrl = (url) => {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const gridFsMatch = decoded.match(/\/files\/([a-f0-9]{24})(?:\?|$)/i);
    if (gridFsMatch?.[1]) return gridFsMatch[1];
    const marker = '/storage/v1/object/public/aviora-documents/';
    const index = decoded.indexOf(marker);
    if (index === -1) return null;
    return decoded.slice(index + marker.length).split('?')[0];
  } catch (error) {
    return null;
  }
};

const purgeRequestPrivateData = async (requestId, requestData) => {
  const messagesSnapshot = await getDocs(collection(db, 'requests', requestId, 'messages'));
  await Promise.all(messagesSnapshot.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));

  const paths = [
    ...(requestData.documentPaths || []),
    ...(requestData.documentUrls || []).map(getStoragePathFromUrl),
  ].filter(Boolean);
  const uniquePaths = [...new Set(paths)];
  await Promise.all(uniquePaths.map((path) => deleteDocument(path).catch((error) => {
    console.warn(`Could not delete storage object ${path}:`, error.message);
  })));
};

const getTimestampMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return new Date(value).getTime() || 0;
};

const sortRequestsNewestFirst = (requests) => {
  return [...requests].sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
};

/**
 * Registers a real-time listener for requests submitted by a specific passenger.
 * 
 * @param {string} userId - UID of the passenger.
 * @param {Function} callback - Callback function receiving the list of requests.
 * @returns {Function} Unsubscribe function.
 */
export const getPassengerRequests = (userId, callback) => {
  const requestsCollection = collection(db, 'requests');
  const q = query(
    requestsCollection,
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ ...doc.data(), id: doc.id });
      });
      callback(sortRequestsNewestFirst(requests));
    },
    (error) => {
      console.error('Error in passenger requests listener:', error);
    }
  );
};

/**
 * Performs a one-time fetch of a request document by ID.
 * 
 * @param {string} requestId - ID of the request.
 * @returns {Promise<Object | null>} The request document data with id merged, or null.
 */
export const getRequestById = async (requestId) => {
  try {
    const docRef = doc(db, 'requests', requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching request by ID:', error);
    throw new Error('Failed to retrieve request details.');
  }
};

/**
 * Sets up a real-time listener on a single request document.
 * 
 * @param {string} requestId - The request document ID.
 * @param {Function} onUpdate - Callback invoked when request document updates.
 * @param {Function} onError - Callback invoked if listener fails.
 * @returns {Function} Unsubscribe function.
 */
export const subscribeToRequest = (requestId, onUpdate, onError) => {
  const docRef = doc(db, 'requests', requestId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({ ...docSnap.data(), id: docSnap.id });
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error(`Error in request listener for ${requestId}:`, error);
      if (onError) onError(error);
    }
  );
};

/**
 * Registers a real-time listener for all requests in the system (for staff/admin).
 * 
 * @param {Function} callback - Callback function receiving the list of all requests.
 * @returns {Function} Unsubscribe function.
 */
export const getAllRequests = (callback) => {
  const requestsCollection = collection(db, 'requests');
  const q = query(requestsCollection, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ ...doc.data(), id: doc.id });
      });
      callback(requests);
    },
    (error) => {
      console.error('Error in all requests listener:', error);
    }
  );
};

// =========================================================================
// PHASE 4: STAFF & ADMIN WORKSPACE SERVICES
// =========================================================================

/**
 * Fetch ALL requests — for staff/admin use.
 * Returns real-time listener (onSnapshot), call the returned unsubscribe on unmount.
 * 
 * @param {Function} callback - Callback function receiving requests array.
 * @returns {Function} Unsubscribe function.
 */
export const getAllRequestsListener = (callback) => {
  const requestsCol = collection(db, 'requests');
  const q = query(requestsCol, orderBy('createdAt', 'desc'));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const requests = [];
      snapshot.forEach((docSnap) => {
        requests.push({ ...docSnap.data(), id: docSnap.id, requestId: docSnap.id });
      });
      callback(requests);
    },
    (error) => {
      console.error('Error in getAllRequestsListener:', error);
    }
  );
};

/**
 * Fetch requests assigned to one staff member.
 * Real-time listener filtered by assignedStaff.uid.
 *
 * @param {string} staffUid - Staff auth UID.
 * @param {Function} callback - Callback function receiving requests array.
 * @returns {Function} Unsubscribe function.
 */
export const getStaffRequestsListener = (staffUid, callback) => {
  const requestsCol = collection(db, 'requests');
  const q = query(
    requestsCol,
    where('assignedStaff.uid', '==', staffUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = [];
      snapshot.forEach((docSnap) => {
        requests.push({ ...docSnap.data(), id: docSnap.id, requestId: docSnap.id });
      });
      callback(requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }));
    },
    (error) => {
      console.error('Error in getStaffRequestsListener:', error);
    }
  );
};

/**
 * Fetch requests for a specific passenger.
 * Real-time listener filtered by userId.
 * 
 * @param {string} userId - Passenger's auth UID.
 * @param {Function} callback - Callback function receiving requests array.
 * @returns {Function} Unsubscribe function.
 */
export const getPassengerRequestsListener = (userId, callback) => {
  const requestsCol = collection(db, 'requests');
  const q = query(
    requestsCol,
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests = [];
      snapshot.forEach((docSnap) => {
        requests.push({ ...docSnap.data(), id: docSnap.id, requestId: docSnap.id });
      });
      callback(sortRequestsNewestFirst(requests));
    },
    (error) => {
      console.error('Error in getPassengerRequestsListener:', error);
    }
  );
};

/**
 * Fetch a single request by ID — real-time listener.
 * 
 * @param {string} requestId - The request document ID.
 * @param {Function} callback - Callback function receiving single request object.
 * @returns {Function} Unsubscribe function.
 */
export const getRequestListener = (requestId, callback) => {
  const docRef = doc(db, 'requests', requestId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ ...docSnap.data(), id: docSnap.id, requestId: docSnap.id });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in getRequestListener:', error);
    }
  );
};

/**
 * Update the status of a request.
 * - Updates status field.
 * - Appends { status, note, updatedBy, timestamp } to statusHistory array.
 * - Writes a notification document to /notifications/{passengerId}/items/{auto-id}.
 * 
 * @param {string} requestId - ID of the request.
 * @param {string} newStatus - The new status to transition to.
 * @param {string} note - Status change commentary.
 * @param {string} staffName - Name of the updater (staff).
 * @param {string} passengerId - ID of the target passenger.
 * @returns {Promise<void>}
 */
export const updateRequestStatus = async (requestId, newStatus, note, staffName, passengerId) => {
  try {
    if (!STATUS_LIST.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const docRef = doc(db, 'requests', requestId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Request document does not exist.');
    }
    const requestData = docSnap.data();
    const passengerName = requestData.passengerName || 'Passenger';
    const isCancel = newStatus === 'Cancelled';
    const expectedNextStatus = getNextStatus(requestData.status);

    if (!isCancel && newStatus !== expectedNextStatus) {
      throw new Error(`Invalid transition from ${requestData.status} to ${newStatus}.`);
    }

    if (newStatus === 'Staff Assigned' && !requestData.assignedStaff?.uid) {
      throw new Error('Select a staff member before marking the request as assigned.');
    }

    const historyEntry = {
      status: newStatus,
      note: note || `Status updated to ${newStatus}`,
      updatedBy: staffName,
      timestamp: Timestamp.now(),
    };

    const shouldClose = newStatus === 'Completed' || newStatus === 'Cancelled';

    if (shouldClose) {
      await purgeRequestPrivateData(requestId, requestData);
    }

    await updateDoc(docRef, {
      status: newStatus,
      statusHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
      ...(shouldClose ? {
        documentUrls: [],
        documentPaths: [],
        requestId: null,
        privateDataPurged: true,
        closedAt: Timestamp.now(),
      } : {}),
    });

    if (shouldClose && requestData.assignedStaff?.uid) {
      await updateDoc(doc(db, 'staff', requestData.assignedStaff.uid), {
        available: true,
      });
    }

    // Write notification document using notificationService
    await createNotification(passengerId, requestId, newStatus, passengerName);
  } catch (error) {
    console.error('Error updating request status:', error);
    throw new Error(error.message || 'Failed to update request status.');
  }
};

/**
 * Assign a staff member to a request.
 * - Updates assignedStaff: { uid, name, mobile }
 * - Changes status to "Staff Assigned"
 * - Appends to statusHistory
 * - Writes notification to passenger
 * 
 * @param {string} requestId - The request document ID.
 * @param {Object} staffMember - The staff member details ({ uid, name, mobile }).
 * @param {string} passengerId - ID of the passenger.
 * @param {string} assignedByName - Name of admin/staff updating the assignment.
 * @returns {Promise<void>}
 */
export const assignStaffToRequest = async (requestId, staffMember, passengerId, assignedByName) => {
  try {
    const docRef = doc(db, 'requests', requestId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Request document does not exist.');
    }
    const requestData = docSnap.data();
    const passengerName = requestData.passengerName || 'Passenger';
    const canAssign =
      requestData.status === 'Under Review' ||
      (requestData.assignedStaff && !['Completed', 'Cancelled'].includes(requestData.status));

    if (!canAssign) {
      throw new Error('Staff can only be assigned after a request is under review.');
    }

    // Store compatible fields for backward compatibility, plus matching staffMember
    const assignedStaff = {
      uid: staffMember.uid,
      name: staffMember.name,
      mobile: staffMember.mobile || '',
      staffId: staffMember.uid,
      staffName: staffMember.name,
      staffMobile: staffMember.mobile || '',
      assignedAt: Timestamp.now(),
    };

    const historyEntry = {
      status: 'Staff Assigned',
      note: `Staff member ${staffMember.name} assigned by ${assignedByName}.`,
      updatedBy: assignedByName,
      timestamp: Timestamp.now(),
    };

    await updateDoc(docRef, {
      assignedStaff,
      status: 'Staff Assigned',
      statusHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
    });

    // Mark staff member as unavailable
    const staffDocRef = doc(db, 'staff', staffMember.uid);
    await updateDoc(staffDocRef, {
      available: false,
    });

    // Notify passenger
    await createNotification(passengerId, requestId, 'Staff Assigned', passengerName);
  } catch (error) {
    console.error('Error assigning staff member:', error);
    throw new Error(error.message || 'Failed to assign staff.');
  }
};

/**
 * Fetch all staff from /staff collection where available == true.
 * One-time fetch (not real-time).
 * 
 * @returns {Promise<Array>} List of available staff.
 */
export const getAvailableStaff = async () => {
  try {
    const staffCol = collection(db, 'staff');
    const q = query(staffCol, where('available', '==', true));
    const snapshot = await getDocs(q);
    const staff = [];
    snapshot.forEach((docSnap) => {
      staff.push({ ...docSnap.data(), uid: docSnap.id, id: docSnap.id });
    });
    return staff;
  } catch (error) {
    console.error('Error fetching available staff:', error);
    throw new Error('Failed to fetch available staff: ' + error.message);
  }
};

/**
 * Fetch all staff (available or not) — for admin report.
 * One-time fetch (not real-time).
 * 
 * @returns {Promise<Array>} List of all staff.
 */
export const getAllStaff = async () => {
  try {
    const staffCol = collection(db, 'staff');
    const snapshot = await getDocs(staffCol);
    const staff = [];
    snapshot.forEach((docSnap) => {
      staff.push({ ...docSnap.data(), uid: docSnap.id, id: docSnap.id });
    });
    return staff;
  } catch (error) {
    console.error('Error fetching all staff:', error);
    throw new Error('Failed to fetch all staff: ' + error.message);
  }
};

/**
 * Send a message in a request thread.
 * Adds doc to /requests/{requestId}/messages/.
 * 
 * @param {string} requestId - The request document ID.
 * @param {string} senderId - UID of the message sender.
 * @param {string} senderName - Name of the message sender.
 * @param {string} senderRole - Role of the message sender ("passenger" | "staff" | "admin").
 * @param {string} text - The message text.
 * @returns {Promise<void>}
 */
export const sendMessage = async (requestId, senderId, senderName, senderRole, text) => {
  try {
    const messagesCol = collection(db, 'requests', requestId, 'messages');
    await addDoc(messagesCol, {
      senderId,
      senderName,
      senderRole,
      text,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message: ' + error.message);
  }
};

/**
 * Listen to messages in real-time for a request.
 * Returns unsubscribe function.
 * 
 * @param {string} requestId - The request document ID.
 * @param {Function} callback - Callback function receiving message list.
 * @returns {Function} Unsubscribe function.
 */
export const getMessagesListener = (requestId, callback) => {
  const messagesCol = collection(db, 'requests', requestId, 'messages');
  const q = query(messagesCol, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((docSnap) => {
        messages.push({ ...docSnap.data(), id: docSnap.id });
      });
      callback(messages);
    },
    (error) => {
      console.error('Error in getMessagesListener:', error);
    }
  );
};

/**
 * Get all requests created today — for daily report.
 * Uses Firestore query: createdAt >= start of today AND < start of tomorrow.
 * 
 * @returns {Promise<Array>} List of requests created today.
 */
export const getTodayRequests = async () => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const requestsCol = collection(db, 'requests');
    const q = query(
      requestsCol, 
      where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
      where('createdAt', '<', Timestamp.fromDate(startOfTomorrow))
    );
    
    const snapshot = await getDocs(q);
    const requests = [];
    snapshot.forEach((docSnap) => {
      requests.push({ ...docSnap.data(), id: docSnap.id, requestId: docSnap.id });
    });
    return requests;
  } catch (error) {
    console.error('Error fetching today\'s requests:', error);
    throw new Error('Failed to fetch today\'s requests: ' + error.message);
  }
};

/**
 * Mark a notification as read.
 * 
 * @param {string} userId - Auth UID of the passenger.
 * @param {string} notificationId - ID of the notification.
 * @returns {Promise<void>}
 */
export const markNotificationRead = async (userId, notificationId) => {
  try {
    const docRef = doc(db, 'notifications', userId, 'items', notificationId);
    await updateDoc(docRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to update notification: ' + error.message);
  }
};

/**
 * Get notifications for a user — real-time listener.
 * 
 * @param {string} userId - Auth UID of the passenger.
 * @param {Function} callback - Callback function receiving notifications array.
 * @returns {Function} Unsubscribe function.
 */
export const getNotificationsListener = (userId, callback) => {
  const notificationsCol = collection(db, 'notifications', userId, 'items');
  const q = query(notificationsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = [];
      snapshot.forEach((docSnap) => {
        notifications.push({ ...docSnap.data(), id: docSnap.id });
      });
      callback(notifications);
    },
    (error) => {
      console.error('Error in getNotificationsListener:', error);
    }
  );
};

/**
 * Submit a star rating for a completed request.
 * 
 * @param {string} requestId - The request document ID.
 * @param {number} rating - The numerical rating.
 * @returns {Promise<void>}
 */
export const rateAssistance = async (requestId, rating) => {
  try {
    const docRef = doc(db, 'requests', requestId);
    await updateDoc(docRef, {
      rating,
    });
  } catch (error) {
    console.error('Error rating assistance:', error);
    throw new Error('Failed to submit rating. Please try again.');
  }
};
