import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { tileDefinitions, worldConfigs, maps, mapChunks } from './schema';

// Select types (read from DB)
export type TileDefinition = InferSelectModel<typeof tileDefinitions>;
export type WorldConfig = InferSelectModel<typeof worldConfigs>;
export type MapDef = InferSelectModel<typeof maps>;
export type MapChunk = InferSelectModel<typeof mapChunks>;

// Insert types (write to DB)
export type NewTileDefinition = InferInsertModel<typeof tileDefinitions>;
export type NewWorldConfig = InferInsertModel<typeof worldConfigs>;
export type NewMap = InferInsertModel<typeof maps>;
export type NewMapChunk = InferInsertModel<typeof mapChunks>;

// Tile flags bitmask values (mirrors Unity TileFlags enum)
export const TileFlags = {
  None: 0,
  Walkable: 1,
  Swimmable: 2,
  Elevated: 4,
  Transparent: 8,
  Damaging: 16,
  Interactable: 32,
} as const;

// Tile categories
export type TileCategory = 'terrain' | 'decoration' | 'obstacle';

// Map modes
export type MapMode = 'discovery' | 'ai_generated' | 'prebuilt';

// Map statuses
export type MapStatus = 'draft' | 'generating' | 'ready' | 'archived';
