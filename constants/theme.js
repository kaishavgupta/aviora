import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

/**
 * Common color palette definition for Aviora.
 * Contains both light and dark variations with custom helper tokens.
 */
export const fontConfig = {
  default: {
    regular: {
      fontFamily: 'sans-serif',
      fontWeight: '400',
      fontSize: 16,
    },
    medium: {
      fontFamily: 'sans-serif',
      fontWeight: '500',
      fontSize: 18,
    },
    light: {
      fontFamily: 'sans-serif',
      fontWeight: '300',
      fontSize: 14,
    },
    thin: {
      fontFamily: 'sans-serif',
      fontWeight: '200',
      fontSize: 12,
    },
  },
};

export const colors = {
  light: {
    primary: '#1A3C6E', // Deep aviation blue
    secondary: '#F59E0B', // Amber status/CTA
    background: '#F8FAFC', // Soft white/gray background
    surface: '#FFFFFF', // Clean white card surface
    text: '#1E293B', // Slate dark text
    subtext: '#64748B', // Soft grey subtext
    border: '#E2E8F0', // Border outline gray
    card: '#FFFFFF', // Card surface
    error: '#DC2626', // Error red
    success: '#16A34A', // Success green
    warning: '#D97706', // Warning amber
    inputBg: '#F1F5F9', // Input field background
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1E293B',
    outline: '#E2E8F0',
  },
  dark: {
    primary: '#3B82F6', // Lighter blue for dark bg readability
    secondary: '#F59E0B', // Amber status/CTA
    background: '#0F172A', // Slate dark background
    surface: '#1E293B', // Slate dark card surface
    text: '#F1F5F9', // Light text
    subtext: '#94A3B8', // Soft slate grey subtext
    border: '#334155', // Border outline
    card: '#1E293B', // Card surface
    error: '#EF4444', // Lighter error red
    success: '#22C55E', // Lighter success green
    warning: '#FBBF24', // Lighter warning amber
    inputBg: '#334155', // Dark input field background
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#F1F5F9',
    outline: '#334155',
  }
};

/**
 * Custom React Native Paper Light Theme.
 * Merges MD3LightTheme with Aviora light branding colors.
 */
export const lightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.light.primary,
    secondary: colors.light.secondary,
    error: colors.light.error,
    background: colors.light.background,
    surface: colors.light.surface,
    onPrimary: colors.light.onPrimary,
    onSecondary: colors.light.onSecondary,
    onSurface: colors.light.onSurface,
    outline: colors.light.outline,
    
    // Custom Color Tokens Extended for useTheme()
    subtext: colors.light.subtext,
    border: colors.light.border,
    card: colors.light.card,
    success: colors.light.success,
    warning: colors.light.warning,
    inputBg: colors.light.inputBg,
    
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#FFFFFF',
      level2: '#F1F5F9',
    }
  }
};

/**
 * Custom React Native Paper Dark Theme.
 * Merges MD3DarkTheme with Aviora dark branding colors.
 */
export const darkTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.dark.primary,
    secondary: colors.dark.secondary,
    error: colors.dark.error,
    background: colors.dark.background,
    surface: colors.dark.surface,
    onPrimary: colors.dark.onPrimary,
    onSecondary: colors.dark.onSecondary,
    onSurface: colors.dark.onSurface,
    outline: colors.dark.outline,
    
    // Custom Color Tokens Extended for useTheme()
    subtext: colors.dark.subtext,
    border: colors.dark.border,
    card: colors.dark.card,
    success: colors.dark.success,
    warning: colors.dark.warning,
    inputBg: colors.dark.inputBg,
    
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#1E293B',
      level2: '#111827',
    }
  }
};

/**
 * Quick helper utility to get color palette by mode.
 * 
 * @param {boolean} isDarkMode - Theme mode flag.
 * @returns {Object} Color values.
 */
export const getColors = (isDarkMode) => {
  return isDarkMode ? colors.dark : colors.light;
};
