import {
  pgTable,
  serial,
  bigserial,
  varchar,
  integer,
  real,
  timestamp,
  index,
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

// ─── player_sessions ─────────────────────────────────────────────
// Cross-module reference: map_id references maps.id from module-maps
export const playerSessions = pgTable('player_sessions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id')
    .references(() => players.id)
    .notNull(),
  mapId: integer('map_id'), // FK to maps.id — cross-module, enforced at DB level
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  startTileX: integer('start_tile_x'),
  startTileY: integer('start_tile_y'),
  endTileX: integer('end_tile_x'),
  endTileY: integer('end_tile_y'),
  tilesTraveled: integer('tiles_traveled').notNull().default(0),
  chunksLoaded: integer('chunks_loaded').notNull().default(0),
});

// ─── player_positions ────────────────────────────────────────────
// High-frequency position tracking (1Hz from Unity client)
export const playerPositions = pgTable(
  'player_positions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id)
      .notNull(),
    sessionId: integer('session_id')
      .references(() => playerSessions.id)
      .notNull(),
    tileX: integer('tile_x').notNull(),
    tileY: integer('tile_y').notNull(),
    chunkX: integer('chunk_x').notNull(),
    chunkY: integer('chunk_y').notNull(),
    worldX: real('world_x').notNull(),
    worldY: real('world_y').notNull(),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [
    index('player_positions_player_time').on(table.playerId, table.recordedAt),
  ]
);

// Export all schemas for registry composition
export const playersSchema = {
  players,
  playerSessions,
  playerPositions,
};
