import { defineConfig } from 'vitest/config';

/**
 * Node-only tests. The app itself is not unit-tested here — that needs a renderer and a
 * device — but anything that is plain Node, such as applying the generated migration to
 * a real SQLite database, runs anywhere and is worth running on every push.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
