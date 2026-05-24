require('dotenv').config();

/** Prefer non-empty .env at build time, then app.json extra (baked into APK on EAS). */
const pick = (config, key) => {
  const fromEnv = process.env[key];
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const fromExtra = config.extra?.[key];
  if (fromExtra && String(fromExtra).trim()) return String(fromExtra).trim();
  return '';
};

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    EXPO_FIREBASE_API_KEY: pick(config, 'EXPO_FIREBASE_API_KEY'),
    EXPO_FIREBASE_AUTH_DOMAIN: pick(config, 'EXPO_FIREBASE_AUTH_DOMAIN'),
    EXPO_FIREBASE_PROJECT_ID: pick(config, 'EXPO_FIREBASE_PROJECT_ID'),
    EXPO_FIREBASE_STORAGE_BUCKET: pick(config, 'EXPO_FIREBASE_STORAGE_BUCKET'),
    EXPO_FIREBASE_MESSAGING_SENDER_ID: pick(config, 'EXPO_FIREBASE_MESSAGING_SENDER_ID'),
    EXPO_FIREBASE_APP_ID: pick(config, 'EXPO_FIREBASE_APP_ID'),
    EXPO_GRIDFS_API_URL: pick(config, 'EXPO_GRIDFS_API_URL'),
    EXPO_GRIDFS_API_KEY: pick(config, 'EXPO_GRIDFS_API_KEY'),
    eas: {
      ...config.extra?.eas,
      projectId: config.extra?.eas?.projectId || '04c5aef3-01ce-48bf-9def-11169f2e339f',
    },
  },
});
