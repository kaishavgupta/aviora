import { create } from 'zustand';
import { 
  saveRequestDraft, 
  loadRequestDraft, 
  clearRequestDraft,
  getPassengerRequests 
} from '../services/requestService';

/**
 * Zustand store to manage passenger assistance requests, admin workspaces,
 * real-time messages threads, analytical daily reports, and staff listings.
 */
export const useRequestStore = create((set, get) => ({
  // Existing Passenger States
  requests: [],
  activeRequest: null,
  draftForm: null,
  isLoading: false,
  unsubscribeRequests: null,
  unreadNotificationCount: 0,

  // New Admin & Staff States
  allRequests: [],
  messages: [],
  todayReport: null,
  staffList: [],
  unsubscribeAll: [],

  // Existing Passenger Actions
  
  /**
   * Caches list of passenger-only requests.
   * 
   * @param {Array<Object>} requests - List of requests.
   */
  setRequests: (requests) => set({ requests }),

  /**
   * Caches the active tracking request.
   * 
   * @param {Object | null} activeRequest - The current active request details.
   */
  setActiveRequest: (activeRequest) => set({ activeRequest }),

  /**
   * Sets store loading state.
   * 
   * @param {boolean} isLoading - Loading status.
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Sets the unread notification count.
   * 
   * @param {number} count - Unread notification count.
   */
  setUnreadCount: (count) => set({ unreadNotificationCount: count }),

  /**
   * Increments the unread notification count by 1.
   */
  incrementUnreadCount: () => set((state) => ({ unreadNotificationCount: state.unreadNotificationCount + 1 })),

  /**
   * Merges partial form data into the local Zustand draft state.
   * 
   * @param {Object} partialData - Partial form values.
   */
  mergeDraftForm: (partialData) => set((state) => ({
    draftForm: state.draftForm ? { ...state.draftForm, ...partialData } : partialData,
  })),

  /**
   * Saves merged form data as a persistent draft in AsyncStorage.
   * 
   * @param {string} userId - Current user UID.
   * @param {Object} formData - New form details to save.
   * @returns {Promise<void>}
   */
  saveDraft: async (userId, formData) => {
    try {
      get().mergeDraftForm(formData);
      const updatedDraft = get().draftForm;
      await saveRequestDraft(userId, updatedDraft);
    } catch (error) {
      console.error('Zustand saveDraft action error:', error);
    }
  },

  /**
   * Loads the draft data from AsyncStorage and sets the Zustand store draftForm.
   * 
   * @param {string} userId - User UID.
   * @returns {Promise<Object | null>} The parsed draft data, or null.
   */
  loadDraft: async (userId) => {
    try {
      set({ isLoading: true });
      const data = await loadRequestDraft(userId);
      set({ draftForm: data, isLoading: false });
      return data;
    } catch (error) {
      console.error('Zustand loadDraft action error:', error);
      set({ isLoading: false });
      return null;
    }
  },

  /**
   * Deletes draft from AsyncStorage and resets Zustand draftForm.
   * 
   * @param {string} userId - User UID.
   * @returns {Promise<void>}
   */
  clearDraft: async (userId) => {
    try {
      await clearRequestDraft(userId);
      set({ draftForm: null });
    } catch (error) {
      console.error('Zustand clearDraft action error:', error);
    }
  },

  /**
   * Subscribes to real-time updates for a passenger's requests.
   * Automatically unsubscribes from any active query listener before binding.
   * 
   * @param {string} userId - Passenger user UID.
   * @returns {Function} Unsubscribe cleanup function.
   */
  subscribeToPassengerRequests: (userId) => {
    // Unsubscribe from existing query subscription
    const currentUnsub = get().unsubscribeRequests;
    if (currentUnsub) {
      currentUnsub();
    }

    set({ isLoading: true });
    const unsubscribe = getPassengerRequests(userId, (data) => {
      set({ requests: data, isLoading: false });
    });

    set({ unsubscribeRequests: unsubscribe });
    return unsubscribe;
  },

  /**
   * Cleans up and unsubscribes from the active real-time passenger query listener.
   */
  unsubscribeFromRequests: () => {
    const currentUnsub = get().unsubscribeRequests;
    if (currentUnsub) {
      currentUnsub();
      set({ unsubscribeRequests: null });
    }
  },

  // New Admin & Staff Actions

  /**
   * Sets the comprehensive list of all requests in the system.
   * 
   * @param {Array<Object>} requests - List of requests.
   */
  setAllRequests: (allRequests) => set({ allRequests }),

  /**
   * Sets the chat message list for the currently viewed request.
   * 
   * @param {Array<Object>} messages - Chat logs.
   */
  setMessages: (messages) => set({ messages }),

  /**
   * Caches aggregated today's statistics report for admin dashboard.
   * 
   * @param {Object | null} todayReport - Today's report statistics.
   */
  setTodayReport: (todayReport) => set({ todayReport }),

  /**
   * Caches available support staff profiles.
   * 
   * @param {Array<Object>} staff - List of staff.
   */
  setStaffList: (staffList) => set({ staffList }),

  /**
   * Caches an unsubscribe function for query cleanups on component unmounts.
   * 
   * @param {Function} fn - The unsubscribe cleanup function.
   */
  addUnsubscribe: (fn) => set((state) => ({ 
    unsubscribeAll: [...state.unsubscribeAll, fn] 
  })),

  /**
   * Resets and calls all cached real-time unsubscribe handles.
   */
  cleanupListeners: () => {
    const subs = get().unsubscribeAll;
    subs.forEach((unsub) => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    set({ unsubscribeAll: [] });
  },
}));

export default useRequestStore;
