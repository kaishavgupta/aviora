import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { normalizeRole } from '../constants/roles';

/**
 * Zustand store to manage user authentication, authorization roles, and profiles.
 * Provides selectors and actions for application routing.
 */
export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  redirectToLogin: false,

  /**
   * Sets the user credentials, their role, and profile details in the store.
   * Also sets isAuthenticated to true and isLoading to false.
   * 
   * @param {import('firebase/auth').User | null} user - The Firebase User object.
   * @param {string | null} role - The user's role ("passenger" | "staff" | "admin").
   * @param {Object | null} profile - The Firestore profile document details.
   */
  setUser: (user, role, profile) => set({
    user,
    role: normalizeRole(role),
    userProfile: profile ? { ...profile, role: normalizeRole(profile.role || role) } : profile,
    isAuthenticated: !!user,
    isLoading: false,
    redirectToLogin: false,
  }),

  /**
   * Clears the user details from the store, resetting auth state.
   */
  clearUser: () => set({
    user: null,
    role: null,
    userProfile: null,
    isAuthenticated: false,
    isLoading: false,
    redirectToLogin: false,
  }),

  logoutUser: () => set({
    user: null,
    role: null,
    userProfile: null,
    isAuthenticated: false,
    isLoading: false,
    redirectToLogin: true,
  }),

  /**
   * Updates the loading state of the auth processes.
   * 
   * @param {boolean} isLoading - The new loading status.
   */
  setLoading: (isLoading) => set({ isLoading }),
}));

// Subscribe to Firebase Auth state changes immediately.
// This auto-populates the store on app startup based on Firebase's cached credentials.
if (auth) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data();
          const role = normalizeRole(profile.role);
          useAuthStore.getState().setUser(firebaseUser, role, { ...profile, role });
        } else {
          // Fallback if auth exists but firestore record is missing (unlikely but safe)
          useAuthStore.getState().setUser(firebaseUser, 'passenger', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'passenger',
            name: firebaseUser.displayName || 'Passenger',
            mobile: '',
          });
        }
      } catch (error) {
        console.error('Error fetching user document in auth listener:', error);
        useAuthStore.getState().setUser(firebaseUser, 'passenger', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'passenger',
        });
      }
    } else {
      const currentState = useAuthStore.getState();
      if (currentState.redirectToLogin) {
        useAuthStore.getState().logoutUser();
      } else {
        useAuthStore.getState().clearUser();
      }
    }
  });
} else {
  console.warn('[authStore] Firebase auth is not initialized. Ensure ENV vars are configured.');
  useAuthStore.getState().clearUser();
}
