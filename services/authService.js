import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizeRole, ROLES } from '../constants/roles';

/**
 * Translates standard Firebase Auth error codes into human-readable messages.
 * 
 * @param {Error} error - The error object returned from Firebase.
 * @returns {string} A friendly, plain English error message.
 */
export const translateAuthError = (error) => {
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already in use by another account.';
    case 'auth/weak-password':
      return 'The password is too weak. It must be at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is disabled in Firebase.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet and try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Logs in a user using email and password, then fetches their profile role from Firestore.
 * 
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<{user: import('firebase/auth').User, role: string, profile: Object}>} The logged-in user object, their role, and their full profile document.
 * @throws {Error} Relays custom error messages if login fails.
 */
const ensureAuth = () => {
  if (!auth) {
    throw new Error('Firebase authentication is not configured. Please add your Firebase keys in env.local.js or Expo extra config.');
  }
};

export const loginWithEmail = async (email, password) => {
  ensureAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch the user document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User profile does not exist in our system.');
    }

    const profileData = userDocSnap.data();
    const role = normalizeRole(profileData.role);
    return {
      user,
      role,
      profile: { ...profileData, role },
    };
  } catch (error) {
    const friendlyMessage = translateAuthError(error);
    throw new Error(friendlyMessage);
  }
};

/**
 * Signs up a new user, creates their profile document in Firestore, and
 * creates a staff document if their role is "staff".
 * 
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @param {string} name - The user's full name.
 * @param {string} mobile - The user's 10-digit mobile number.
 * @param {string} role - The user's role ("passenger" | "staff" | "admin").
 * @returns {Promise<{user: import('firebase/auth').User, role: string, profile: Object}>} The newly created user, their role, and their Firestore profile.
 * @throws {Error} Relays custom error messages if signup fails.
 */
export const signupWithEmail = async (email, password, name, mobile, role) => {
  ensureAuth();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const normalizedRole = normalizeRole(role);

    // Define User Profile Document Data
    const userProfile = {
      uid: user.uid,
      name,
      email,
      mobile,
      role: normalizedRole,
      createdAt: serverTimestamp(),
    };

    // Save user profile in Firestore '/users/{uid}'
    await setDoc(doc(db, 'users', user.uid), userProfile);

    // If role is staff, also create a document in '/staff/{uid}' to track availability status
    if (normalizedRole === ROLES.STAFF) {
      const staffDoc = {
        uid: user.uid,
        name,
        email,
        mobile,
        available: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'staff', user.uid), staffDoc);
    }

    return {
      user,
      role: normalizedRole,
      profile: userProfile,
    };
  } catch (error) {
    const friendlyMessage = translateAuthError(error);
    throw new Error(friendlyMessage);
  }
};

/**
 * Signs the current user out from Firebase Auth.
 * 
 * @returns {Promise<void>} Resolves when sign-out is successful.
 * @throws {Error} Relays error if sign-out fails.
 */
export const logout = async () => {
  ensureAuth();
  try {
    await signOut(auth);
  } catch (error) {
    const friendlyMessage = translateAuthError(error);
    throw new Error(friendlyMessage);
  }
};

/**
 * Retrieves the currently authenticated Firebase user.
 * 
 * @returns {import('firebase/auth').User | null} The current user or null.
 */
export const getCurrentUser = () => {
  ensureAuth();
  return auth.currentUser;
};
