import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

// ─── players ─────────────────────────────────────────────────────
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  displayName: varchar('display_name', { length: 64 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  totalPlayTimeSeconds: integer('total_play_time_seconds').notNull().default(0),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export all schemas for registry composition
// NOTE: playerSessions moved to @oven/module-sessions
// NOTE: playerPositions moved to @oven/module-player-map-position
export const playersSchema = {
  players,
};
