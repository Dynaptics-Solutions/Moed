import type { Config } from 'drizzle-kit';

// `driver: 'expo'` makes drizzle-kit emit migrations in the bundle-able form the
// expo-sqlite migrator reads. Generated output is committed so a build never needs
// drizzle-kit at runtime: pnpm db:generate
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
