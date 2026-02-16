// Main editor component
export { MapEditor } from './components/MapEditor';

// Individual components for custom layouts
export { TileMapCanvas } from './components/TileMapCanvas';
export { TilePalette } from './components/TilePalette';
export { EditorToolbar } from './components/EditorToolbar';
export { Tooltip } from './components/Tooltip';
export { ChunkMesh } from './components/ChunkMesh';
export { ChunkGrid, ChunkBoundaries } from './components/ChunkGrid';
export { PaintLayer } from './components/PaintLayer';
export { CursorHighlight } from './components/CursorHighlight';
export { BoundsOverlay } from './components/BoundsOverlay';
export { StampPreview } from './components/StampPreview';
export { TilePropertiesPanel } from './components/TilePropertiesPanel';

// Store
export { useEditorStore, createEditorStore } from './store/editorStore';
export type { EditorUIState, EditorUIActions, EditorStore } from './store/editorStore';

// Hooks
export { useMapEditor } from './hooks/useMapEditor';
export { useEditorHistory } from './hooks/useEditorHistory';
export { useSpriteLoader, copySpriteTile, fillSolidTile } from './hooks/useSpriteLoader';
export type { SpriteCache } from './hooks/useSpriteLoader';

// Utilities
export { decodeTileData, encodeTileData, chunkKey, parseChunkKey } from './codec';

// Constants
export { TileFlags, TILE_FLAG_ENTRIES, TILE_CATEGORIES } from './types';

// Types
export type {
  TileDef,
  TilesetDef,
  MapRecord,
  MapBounds,
  ChunkRecord,
  EditorTool,
  ChunkKey,
  ChunkData,
  StampPattern,
  MapEditorState,
  TileChange,
  EditorAction,
  CursorPos,
} from './types';
