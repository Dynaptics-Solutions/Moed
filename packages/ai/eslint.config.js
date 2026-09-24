const tseslint = require('typescript-eslint');

/**
 * Plain TypeScript — no React, no React Native — so it gets the TypeScript rules rather
 * than the app's Expo config, the same way `packages/core` does.
 */
module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'dist/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
