// Main editor component
export { MapEditor } from './components/MapEditor';

// Individual components for custom layouts
export { TileMapCanvas } from './components/TileMapCanvas';
export { TilePalette } from './components/TilePalette';
export { EditorToolbar } from './components/EditorToolbar';
export { ChunkMesh } from './components/ChunkMesh';
export { ChunkGrid, ChunkBoundaries } from './components/ChunkGrid';
export { PaintLayer } from './components/PaintLayer';
export { CursorHighlight } from './components/CursorHighlight';

// Hook
export { useMapEditor } from './hooks/useMapEditor';

// Utilities
export { decodeTileData, encodeTileData, chunkKey, parseChunkKey } from './codec';

// Types
export type {
  TileDef,
  MapRecord,
  ChunkRecord,
  EditorTool,
  ChunkKey,
  ChunkData,
  MapEditorState,
} from './types';
