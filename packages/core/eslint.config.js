const tseslint = require('typescript-eslint');

/**
 * Core is plain TypeScript — no React, no React Native — so it gets the TypeScript
 * rules rather than the app's Expo config.
 *
 * It went unlinted until now: the root `pnpm lint` reported "Scope: 2 of 3 workspace
 * projects" and nobody read it as a warning. Every rule the app is held to was absent
 * from the package that holds the arithmetic the whole product depends on.
 */
module.exports = tseslint.config(
  { ignores: ['node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // The `_rule`/`_cleared` convention is used across the workspace for a binding
      // that exists only to be destructured away.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // This file. The package is CommonJS, so a flat config has to `require`.
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
