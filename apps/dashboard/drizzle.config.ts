import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    '../../packages/module-registry/src/schema.ts',
    '../../packages/module-maps/src/schema.ts',
    '../../packages/module-players/src/schema.ts',
    '../../packages/module-sessions/src/schema.ts',
    '../../packages/module-player-map-position/src/schema.ts',
    '../../packages/module-workflows/src/schema.ts',
    '../../packages/module-roles/src/schema.ts',
    '../../packages/module-config/src/schema.ts',
    '../../packages/module-tenants/src/schema.ts',
    '../../packages/module-subscriptions/src/schema.ts',
    '../../packages/module-auth/src/schema.ts',
    '../../packages/module-forms/src/schema.ts',
    '../../packages/module-flows/src/schema.ts',
    '../../packages/module-ui-flows/src/schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
