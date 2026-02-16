/** Tile definition from the server */
export interface TileDef {
  id: number;
  tileId: number;
  name: string;
  colorHex: string;
  flags: number;
  category: string;
  spritePath?: string | null;
  tilesetId?: number | null;
  spriteX?: number | null;
  spriteY?: number | null;
}

/** Tileset definition from the server */
export interface TilesetDef {
  id: number;
  name: string;
  imagePath: string | null;
  tileWidth: number;
  tileHeight: number;
  columns: number | null;
  rows: number | null;
}

/** Map record from the server */
export interface MapRecord {
  id: number;
  name: string;
  mode: 'discovery' | 'prebuilt' | 'ai_generated';
  status: string;
  seed: number | null;
  worldConfigId: number | null;
  totalChunks: number;
  bounds: unknown | null;
  boundsMinX: number | null;
  boundsMinY: number | null;
  boundsMaxX: number | null;
  boundsMaxY: number | null;
}

/** Bounds in chunk coordinates */
export interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Chunk record from the server */
export interface ChunkRecord {
  id: number;
  mapId: number;
  chunkX: number;
  chunkY: number;
  layerData: string; // base64-encoded Uint16Array
  version: number;
}

/** Editor tool modes */
export type EditorTool = 'paint' | 'erase' | 'fill' | 'pan' | 'select' | 'stamp';

/** A chunk coordinate key like "0,0" */
export type ChunkKey = string;

/** Parsed chunk data for in-memory editing */
export interface ChunkData {
  chunkX: number;
  chunkY: number;
  tiles: Uint16Array; // chunkSize * chunkSize
  dirty: boolean;
}

/** A multi-tile stamp pattern */
export interface StampPattern {
  name: string;
  width: number;   // in tiles
  height: number;  // in tiles
  tiles: number[]; // tileId[], row-major, length = width * height
}

/** A single tile change for undo/redo */
export interface TileChange {
  chunkKey: ChunkKey;
  localIndex: number;
  oldTileId: number;
  newTileId: number;
}

/** A recorded editor action (one undo/redo step) */
export interface EditorAction {
  type: 'paint' | 'erase' | 'stamp';
  changes: TileChange[];
  timestamp: number;
}

/** Tile flags bitmask (matches module-maps TileFlags) */
export const TileFlags = {
  None: 0,
  Walkable: 1,
  Swimmable: 2,
  Elevated: 4,
  Transparent: 8,
  Damaging: 16,
  Interactable: 32,
} as const;

/** All defined flag entries for UI rendering */
export const TILE_FLAG_ENTRIES: { key: string; value: number; label: string }[] = [
  { key: 'Walkable', value: 1, label: 'Walkable' },
  { key: 'Swimmable', value: 2, label: 'Swimmable' },
  { key: 'Elevated', value: 4, label: 'Elevated' },
  { key: 'Transparent', value: 8, label: 'Transparent' },
  { key: 'Damaging', value: 16, label: 'Damaging' },
  { key: 'Interactable', value: 32, label: 'Interactable' },
];

/** Tile categories */
export const TILE_CATEGORIES = ['terrain', 'decoration', 'obstacle'] as const;

/** Cursor position in world coordinates */
export interface CursorPos {
  worldX: number;
  worldY: number;
}

/** Editor state */
export interface MapEditorState {
  mapId: number | null;
  map: MapRecord | null;
  tiles: TileDef[];
  tilesets: TilesetDef[];
  chunks: Map<ChunkKey, ChunkData>;
  selectedTileId: number;
  tool: EditorTool;
  chunkSize: number;
  zoom: number;
  loading: boolean;
  saving: boolean;
  boundsVisible: boolean;
  activeStamp: StampPattern | null;
  cursorPos: CursorPos | null;
}
