import {
  pgTable,
  serial,
  smallint,
  varchar,
  text,
  real,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ─── tile_definitions ────────────────────────────────────────────
// Maps to Unity's ITileRegistry: each row defines a tile type
export const tileDefinitions = pgTable('tile_definitions', {
  id: serial('id').primaryKey(),
  tileId: smallint('tile_id').notNull().unique(),
  name: varchar('name', { length: 64 }).notNull(),
  colorHex: varchar('color_hex', { length: 9 }).notNull(), // "#RRGGBBAA"
  flags: smallint('flags').notNull().default(0), // Bitmask: Walkable=1, Swimmable=2, etc.
  category: varchar('category', { length: 32 }).notNull().default('terrain'),
  spritePath: varchar('sprite_path', { length: 256 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── world_configs ───────────────────────────────────────────────
// All configurable world parameters — maps to Unity GameBootstrap + systems
export const worldConfigs = pgTable('world_configs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(false),

  // Chunk system
  chunkSize: integer('chunk_size').notNull().default(32),
  loadRadius: integer('load_radius').notNull().default(2),
  maxLoadsPerFrame: integer('max_loads_per_frame').notNull().default(2),
  tilemapPoolSize: integer('tilemap_pool_size').notNull().default(30),

  // Terrain generation
  terrainNoiseScale: real('terrain_noise_scale').notNull().default(0.05),
  terrainNoiseOffset: real('terrain_noise_offset').notNull().default(1000.0),
  decorationNoiseScale: real('decoration_noise_scale').notNull().default(0.15),
  decorationNoiseThreshold: real('decoration_noise_threshold').notNull().default(0.78),
  biomeThresholds: jsonb('biome_thresholds').notNull().default({
    water: 0.3,
    dirt: 0.45,
    grass: 0.75,
  }),

  // Player
  playerMoveSpeed: real('player_move_speed').notNull().default(5.0),
  playerColor: jsonb('player_color').notNull().default({
    r: 1, g: 0.8, b: 0.2, a: 1,
  }),

  // Camera
  cameraOrthoSize: real('camera_ortho_size').notNull().default(8.0),
  cameraSmoothSpeed: real('camera_smooth_speed').notNull().default(10.0),
  cameraBgColor: jsonb('camera_bg_color').notNull().default({
    r: 0.051, g: 0.106, b: 0.165,
  }),

  // Strategy
  directionBias: real('direction_bias').notNull().default(-0.5),
  mapMode: varchar('map_mode', { length: 20 }).notNull().default('discovery'),
  seed: integer('seed'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── maps ────────────────────────────────────────────────────────
// Named worlds with status tracking
export const maps = pgTable('maps', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  worldConfigId: integer('world_config_id').references(() => worldConfigs.id),
  mode: varchar('mode', { length: 20 }).notNull().default('discovery'),
  seed: integer('seed'),
  bounds: jsonb('bounds'), // { type: 'rect', minX, minY, maxX, maxY } or { type: 'polygon', points: [[x,y], ...] }
  boundsMinX: integer('bounds_min_x'), // Computed bounding box (backward compat)
  boundsMinY: integer('bounds_min_y'),
  boundsMaxX: integer('bounds_max_x'),
  boundsMaxY: integer('bounds_max_y'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  totalChunks: integer('total_chunks').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── map_chunks ──────────────────────────────────────────────────
// Stored chunk data — bytea for compressed tile layers
export const mapChunks = pgTable(
  'map_chunks',
  {
    id: serial('id').primaryKey(),
    mapId: integer('map_id')
      .references(() => maps.id, { onDelete: 'cascade' })
      .notNull(),
    chunkX: integer('chunk_x').notNull(),
    chunkY: integer('chunk_y').notNull(),
    layerData: text('layer_data').notNull(), // base64-encoded compressed data
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('map_chunks_unique').on(table.mapId, table.chunkX, table.chunkY),
  ]
);

// Export all schemas as a flat object for registry composition
export const mapsSchema = {
  tileDefinitions,
  worldConfigs,
  maps,
  mapChunks,
};
