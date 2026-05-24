import { doc, getDoc, updateDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Update staff availability flag.
 * 
 * @param {string} staffUid - Staff member auth UID.
 * @param {boolean} available - Target availability status.
 * @returns {Promise<void>}
 */
export const setStaffAvailability = async (staffUid, available) => {
  try {
    const staffDocRef = doc(db, 'staff', staffUid);
    await updateDoc(staffDocRef, { available });
  } catch (error) {
    console.error('Error setting staff availability:', error);
    throw new Error('Failed to update staff availability status: ' + error.message);
  }
};

/**
 * Get staff profile by uid.
 * 
 * @param {string} uid - Staff member auth UID.
 * @returns {Promise<Object | null>} The staff profile details, or null.
 */
export const getStaffProfile = async (uid) => {
  try {
    const staffDocRef = doc(db, 'staff', uid);
    const docSnap = await getDoc(staffDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), uid: docSnap.id, id: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    throw new Error('Failed to fetch staff profile: ' + error.message);
  }
};

/**
 * Get all staff members — returns array sorted by name.
 * 
 * @returns {Promise<Array>} List of all staff members.
 */
export const getAllStaffMembers = async () => {
  try {
    const staffCol = collection(db, 'staff');
    const q = query(staffCol, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const staffList = [];
    snapshot.forEach((docSnap) => {
      staffList.push({ ...docSnap.data(), uid: docSnap.id, id: docSnap.id });
    });
    return staffList;
  } catch (error) {
    console.error('Error fetching all staff members:', error);
    throw new Error('Failed to retrieve staff listings: ' + error.message);
  }
};
