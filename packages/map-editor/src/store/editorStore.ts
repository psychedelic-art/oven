import { create } from 'zustand';
import type { EditorTool, StampPattern, CursorPos, TileDef, TilesetDef, MapRecord } from '../types';

/**
 * Zustand store for map editor UI state.
 *
 * Chunk data stays in a mutable ref (useMapEditor) for performance —
 * chunks change on every paint stroke and must not trigger full tree re-renders.
 * UI state (tool, selection, stamps, loading) lives here so components
 * can subscribe to slices without prop drilling or stale closures.
 */

export interface EditorUIState {
  // Identity
  mapId: number | null;
  map: MapRecord | null;

  // Data
  tiles: TileDef[];
  tilesets: TilesetDef[];

  // Tool state
  tool: EditorTool;
  selectedTileId: number;
  activeStamp: StampPattern | null;
  zoom: number;
  boundsVisible: boolean;

  // Cursor (transient — updated on mouse move)
  cursorPos: CursorPos | null;

  // Tile inspection
  inspectedTileDef: TileDef | null;

  // Async
  loading: boolean;
  saving: boolean;
}

export interface EditorUIActions {
  setMapId: (mapId: number | null) => void;
  setMap: (map: MapRecord | null) => void;
  setTiles: (tiles: TileDef[]) => void;
  setTilesets: (tilesets: TilesetDef[]) => void;
  setTool: (tool: EditorTool) => void;
  setSelectedTileId: (tileId: number) => void;
  setActiveStamp: (stamp: StampPattern | null) => void;
  setZoom: (zoom: number) => void;
  setBoundsVisible: (visible: boolean) => void;
  setCursorPos: (pos: CursorPos | null) => void;
  setInspectedTileDef: (tileDef: TileDef | null) => void;
  updateTileInList: (updated: TileDef) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export type EditorStore = EditorUIState & EditorUIActions;

export const createEditorStore = () =>
  create<EditorStore>((set) => ({
    // --- State ---
    mapId: null,
    map: null,
    tiles: [],
    tilesets: [],
    tool: 'paint',
    selectedTileId: 1,
    activeStamp: null,
    zoom: 1,
    boundsVisible: true,
    cursorPos: null,
    inspectedTileDef: null,
    loading: false,
    saving: false,

    // --- Actions ---
    setMapId: (mapId) => set({ mapId }),
    setMap: (map) => set({ map }),
    setTiles: (tiles) => set({ tiles }),
    setTilesets: (tilesets) => set({ tilesets }),
    setTool: (tool) => set({ tool }),
    setSelectedTileId: (tileId) => set({ selectedTileId: tileId }),
    setActiveStamp: (stamp) =>
      set({ activeStamp: stamp, tool: stamp ? 'stamp' : 'paint' }),
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
    setBoundsVisible: (visible) => set({ boundsVisible: visible }),
    setCursorPos: (pos) => set({ cursorPos: pos }),
    setInspectedTileDef: (tileDef) => set({ inspectedTileDef: tileDef }),
    updateTileInList: (updated) =>
      set((state) => ({
        tiles: state.tiles.map((t) => (t.tileId === updated.tileId ? updated : t)),
        inspectedTileDef:
          state.inspectedTileDef?.tileId === updated.tileId ? updated : state.inspectedTileDef,
      })),
    setLoading: (loading) => set({ loading }),
    setSaving: (saving) => set({ saving }),
  }));

/** Default singleton store — used by MapEditor and its children */
export const useEditorStore = createEditorStore();
