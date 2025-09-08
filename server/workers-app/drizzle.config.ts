import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    databaseId: '1522fcf7-4e32-4b84-8b13-67920f3c2a40',
    token: process.env.CLOUDFLARE_D1_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  },
});
