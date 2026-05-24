import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Saves a form draft to local storage.
 * 
 * @param {string} screenName - The form screen namespace.
 * @param {string} userId - Current user UID.
 * @param {Object} data - The form field values.
 * @returns {Promise<void>}
 */
export const saveDraft = async (screenName, userId, data) => {
  try {
    if (!userId) return;
    const key = STORAGE_KEYS.getDraftKey(screenName, userId);
    const draftPayload = {
      data,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(draftPayload));
  } catch (error) {
    console.error(`Error saving draft for ${screenName}:`, error);
  }
};

/**
 * Loads a form draft from local storage.
 * 
 * @param {string} screenName - The form screen namespace.
 * @param {string} userId - Current user UID.
 * @returns {Promise<Object | null>} The parsed draft data payload or null.
 */
export const loadDraft = async (screenName, userId) => {
  try {
    if (!userId) return null;
    const key = STORAGE_KEYS.getDraftKey(screenName, userId);
    const stored = await AsyncStorage.getItem(key);
    if (stored !== null) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error(`Error loading draft for ${screenName}:`, error);
    return null;
  }
};

/**
 * Deletes a form draft from local storage.
 * 
 * @param {string} screenName - The form screen namespace.
 * @param {string} userId - Current user UID.
 * @returns {Promise<void>}
 */
export const deleteDraft = async (screenName, userId) => {
  try {
    if (!userId) return;
    const key = STORAGE_KEYS.getDraftKey(screenName, userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error deleting draft for ${screenName}:`, error);
  }
};

/**
 * Clears all drafts matching the prefix from local storage.
 * 
 * @returns {Promise<void>}
 */
export const clearAllDrafts = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((key) => key.startsWith(STORAGE_KEYS.DRAFT_PREFIX));
    if (draftKeys.length > 0) {
      await AsyncStorage.multiRemove(draftKeys);
    }
  } catch (error) {
    console.error('Error clearing all local drafts:', error);
    throw new Error('Failed to purge local drafts.');
  }
};
