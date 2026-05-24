/**
 * @fileoverview Firebase Service Initialization
 *
 * This module initializes the Firebase App and exports references to:
 * - Firebase Auth (with AsyncStorage persistence for React Native session persistence)
 * - Cloud Firestore (real-time NoSQL database)
 * - Cloud Storage (for uploading document and passport photos)
 *
 * Configuration keys are placeholders and must be replaced with the actual credentials from the Firebase Console.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Try loading a local JS file with secrets for easy local development.
// This file should be gitignored (see env.local.js.example) and should
// export keys via `module.exports = { EXPO_FIREBASE_API_KEY: '...', ... }`.
let LOCAL_ENV = {};
try {
  // Use require so bundler won't statically fail if the file is missing
  // (it will be absent in CI / developer machines until created).
  // eslint-disable-next-line global-require
  LOCAL_ENV = require('../env.local');
} catch (e) {
  LOCAL_ENV = {};
}

// Resolve config values in this order:
// 1. process.env (set by dotenv or build-time env injection)
// 2. local JS override (`env.local.js`) for quick local development
// 3. Expo Constants manifest extra (set via app.config.js / eas.json)
// 4. empty string fallback (prevents undefined runtime crashes)
const env = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (LOCAL_ENV && LOCAL_ENV[key]) return LOCAL_ENV[key];
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key]) return Constants.expoConfig.extra[key];
  if (Constants?.manifest?.extra && Constants.manifest.extra[key]) return Constants.manifest.extra[key];
  return '';
};

// Firebase configuration read from env or expo config
export const firebaseConfig = {
  apiKey: env('EXPO_FIREBASE_API_KEY'),
  authDomain: env('EXPO_FIREBASE_AUTH_DOMAIN'),
  projectId: env('EXPO_FIREBASE_PROJECT_ID'),
  storageBucket: env('EXPO_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('EXPO_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('EXPO_FIREBASE_APP_ID'),
};

// Initialize Firebase App safely — only if we have required config
let app = null;
let auth = null;
let db = null;

if (!firebaseConfig.apiKey) {
  console.warn(
    '[firebase] Missing Firebase API key. Create env.local.js or set EXPO_FIREBASE_* keys in Expo/EAS extra or process.env.'
  );
} else {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // Initialize Firebase Auth with platform-specific persistence
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }

    // Initialize Cloud Firestore Database
    db = getFirestore(app);
  } catch (err) {
    console.error('[firebase] Failed to initialize Firebase:', err);
    // leave auth/db null so app can start; callers should handle null
    app = null;
    auth = null;
    db = null;
  }
}

export { auth, db };
export default app;
