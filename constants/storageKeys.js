/**
 * Single source of truth for all AsyncStorage keys used in the Aviora application.
 */
export const STORAGE_KEYS = {
  THEME: '@aviora_theme',
  NOTIFICATIONS_ENABLED: '@aviora_notifications',
  AUTO_DRAFT: '@aviora_autodraft',
  DRAFT_PREFIX: '@aviora_draft_',
  
  /**
   * Generates a unique key for storing form drafts.
   * 
   * @param {string} screenName - Name of the form screen.
   * @param {string} userId - Current user UID.
   * @returns {string} Unique AsyncStorage key.
   */
  getDraftKey: (screenName, userId) => 
    `@aviora_draft_${screenName}_${userId}`,
    
  USER_PREFERENCES: '@aviora_user_prefs',
};
