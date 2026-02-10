import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { setDb } from '@oven/module-registry/db';
import { registry, wiringRuntime } from '@oven/module-registry';

const sql = neon(process.env.DATABASE_URL!);
const schema = registry.getComposedSchema();

export const db = drizzle(sql, { schema });

// Make db available to all modules via the shared getter
setDb(db);

// Initialize wiring runtime (hooks into event bus to check DB wirings)
wiringRuntime.initialize();
