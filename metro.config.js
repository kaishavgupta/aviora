const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CJS support for Firebase
config.resolver.sourceExts.push('cjs');

// Fix Firebase Auth import registration crash under Hermes
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
