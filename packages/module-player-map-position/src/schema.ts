import {
  pgTable,
  serial,
  bigserial,
  integer,
  real,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ─── player_map_assignments ──────────────────────────────────────
// Tracks which map a player is currently on
// Cross-module FKs: playerId → players.id, mapId → maps.id
export const playerMapAssignments = pgTable(
  'player_map_assignments',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').notNull(),
    mapId: integer('map_id').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    spawnTileX: integer('spawn_tile_x').notNull().default(0),
    spawnTileY: integer('spawn_tile_y').notNull().default(0),
    currentTileX: integer('current_tile_x'),
    currentTileY: integer('current_tile_y'),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
  },
  (table) => [
    index('pma_player_active').on(table.playerId, table.isActive),
  ]
);

// ─── player_positions ────────────────────────────────────────────
// High-frequency position tracking (1Hz from Unity client)
// Moved from module-players with added mapId column
export const playerPositions = pgTable(
  'player_positions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    playerId: integer('player_id').notNull(),
    sessionId: integer('session_id').notNull(),
    mapId: integer('map_id').notNull(),
    tileX: integer('tile_x').notNull(),
    tileY: integer('tile_y').notNull(),
    chunkX: integer('chunk_x').notNull(),
    chunkY: integer('chunk_y').notNull(),
    worldX: real('world_x').notNull(),
    worldY: real('world_y').notNull(),
    recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [
    index('pp_player_time').on(table.playerId, table.recordedAt),
    index('pp_session').on(table.sessionId),
  ]
);

// ─── player_visited_chunks ───────────────────────────────────────
// Fog of war / exploration tracking
export const playerVisitedChunks = pgTable(
  'player_visited_chunks',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').notNull(),
    mapId: integer('map_id').notNull(),
    chunkX: integer('chunk_x').notNull(),
    chunkY: integer('chunk_y').notNull(),
    firstVisitedAt: timestamp('first_visited_at').defaultNow().notNull(),
    visitCount: integer('visit_count').notNull().default(1),
  },
  (table) => [
    uniqueIndex('pvc_unique').on(table.playerId, table.mapId, table.chunkX, table.chunkY),
  ]
);

// Export all schemas for registry composition
export const playerMapPositionSchema = {
  playerMapAssignments,
  playerPositions,
  playerVisitedChunks,
};
