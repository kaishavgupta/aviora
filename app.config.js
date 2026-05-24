require('dotenv').config();

module.exports = ({ config }) => ({
  ...config,
  extra: {
    // Firebase
    EXPO_FIREBASE_API_KEY: process.env.EXPO_FIREBASE_API_KEY || '',
    EXPO_FIREBASE_AUTH_DOMAIN: process.env.EXPO_FIREBASE_AUTH_DOMAIN || '',
    EXPO_FIREBASE_PROJECT_ID: process.env.EXPO_FIREBASE_PROJECT_ID || '',
    EXPO_FIREBASE_STORAGE_BUCKET: process.env.EXPO_FIREBASE_STORAGE_BUCKET || '',
    EXPO_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_FIREBASE_MESSAGING_SENDER_ID || '',
    EXPO_FIREBASE_APP_ID: process.env.EXPO_FIREBASE_APP_ID || '',
    // GridFS upload API
    EXPO_GRIDFS_API_URL: process.env.EXPO_GRIDFS_API_URL || '',
    EXPO_GRIDFS_API_KEY: process.env.EXPO_GRIDFS_API_KEY || '',
    // Any other secrets
  },
});
