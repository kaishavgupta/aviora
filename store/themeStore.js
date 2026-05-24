import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * Zustand store to manage global light and dark theme modes.
 * Dynamically updates Paper components and persists user choices.
 */
export const useThemeStore = create((set, get) => ({
  isDarkMode: false,
  theme: lightTheme,

  /**
   * Toggles the global theme preference, updating states and saving to storage.
   */
  toggleTheme: async () => {
    try {
      const nextMode = !get().isDarkMode;
      const nextTheme = nextMode ? darkTheme : lightTheme;
      
      set({ isDarkMode: nextMode, theme: nextTheme });
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(nextMode));
    } catch (error) {
      console.error('Error toggling app theme:', error);
    }
  },

  /**
   * Initializes theme preferences on application startup.
   */
  initTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (saved !== null) {
        const parsedMode = JSON.parse(saved);
        const activeTheme = parsedMode ? darkTheme : lightTheme;
        set({ isDarkMode: parsedMode, theme: activeTheme });
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
    }
  },
}));

export default useThemeStore;
