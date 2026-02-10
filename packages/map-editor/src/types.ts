/** Tile definition from the server */
export interface TileDef {
  id: number;
  tileId: number;
  name: string;
  colorHex: string;
  flags: number;
  category: string;
  spritePath?: string | null;
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
export type EditorTool = 'paint' | 'erase' | 'fill' | 'pan' | 'select';

/** A chunk coordinate key like "0,0" */
export type ChunkKey = string;

/** Parsed chunk data for in-memory editing */
export interface ChunkData {
  chunkX: number;
  chunkY: number;
  tiles: Uint16Array; // chunkSize * chunkSize
  dirty: boolean;
}

/** Editor state */
export interface MapEditorState {
  mapId: number | null;
  map: MapRecord | null;
  tiles: TileDef[];
  chunks: Map<ChunkKey, ChunkData>;
  selectedTileId: number;
  tool: EditorTool;
  chunkSize: number;
  zoom: number;
  loading: boolean;
  saving: boolean;
}
