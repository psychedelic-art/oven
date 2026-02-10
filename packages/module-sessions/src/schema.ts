import {
  pgTable,
  serial,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

// ─── player_sessions ─────────────────────────────────────────────
// Cross-module references:
//   playerId → players.id (from module-players)
//   mapId → maps.id (from module-maps)
// Both enforced at DB level as plain integers (no Drizzle FK across packages)
export const playerSessions = pgTable('player_sessions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull(),
  mapId: integer('map_id').notNull(), // DB map required — every session needs a map
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  startTileX: integer('start_tile_x'),
  startTileY: integer('start_tile_y'),
  endTileX: integer('end_tile_x'),
  endTileY: integer('end_tile_y'),
  tilesTraveled: integer('tiles_traveled').notNull().default(0),
  chunksLoaded: integer('chunks_loaded').notNull().default(0),
});

// Export schema for registry composition
export const sessionsSchema = {
  playerSessions,
};
