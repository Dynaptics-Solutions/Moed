/**
 * jest-expo, because React Native ships untranspiled source and its own module
 * resolution — a plain runner cannot read it.
 *
 * Two projects rather than one: the render tests need React Native's environment, and
 * the migration test needs plain Node with `node:sqlite`. Running both under one
 * environment means one of them fights it.
 */
module.exports = {
  projects: [
    {
      displayName: 'render',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.render.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm))',
      ],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.node.test.ts'],
      transform: { '^.+\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
    },
  ],
};
