import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    '../../packages/module-registry/src/schema.ts',
    '../../packages/module-maps/src/schema.ts',
    '../../packages/module-players/src/schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
