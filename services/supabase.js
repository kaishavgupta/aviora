import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
// Local override loader (optional). Create `env.local.js` next to project root
// and export keys using `module.exports = { EXPO_SUPABASE_URL: '...', EXPO_SUPABASE_ANON_KEY: '...' }`.
let LOCAL_ENV = {};
try {
  // eslint-disable-next-line global-require
  LOCAL_ENV = require('../env.local');
} catch (e) {
  LOCAL_ENV = {};
}

const env = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (LOCAL_ENV && LOCAL_ENV[key]) return LOCAL_ENV[key];
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key]) return Constants.expoConfig.extra[key];
  if (Constants?.manifest?.extra && Constants.manifest.extra[key]) return Constants.manifest.extra[key];
  return '';
};

// Read credentials from env or Expo config
export const supabaseUrl = env('EXPO_SUPABASE_URL');
export const supabaseAnonKey = env('EXPO_SUPABASE_ANON_KEY');

/**
 * Lazy-initialized Supabase client.
 * Defers creation until first use so initialization errors
 * cannot crash the app on startup.
 */
let _supabase = null;

export const getSupabase = () => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[supabase] Missing SUPABASE URL or ANON key. Create env.local.js or set EXPO_SUPABASE_* keys.');
      return null;
    }
    try {
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return null;
    }
  }
  return _supabase;
};

// For backward compatibility — but won't crash on import
export const supabase = { get instance() { return getSupabase(); } };
export default supabase;
