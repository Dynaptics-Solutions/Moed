const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle emits migrations as .sql; Metro will not resolve them otherwise.
config.resolver.sourceExts.push('sql');

module.exports = config;
