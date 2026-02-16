import { useState, useCallback, useRef } from 'react';
import type {
  TileDef, TilesetDef, MapRecord, ChunkRecord,
  ChunkData, ChunkKey, MapBounds, StampPattern,
} from '../types';
import { decodeTileData, encodeTileData, chunkKey } from '../codec';
import { useEditorHistory } from './useEditorHistory';
import { useEditorStore } from '../store/editorStore';

const DEFAULT_CHUNK_SIZE = 32;

interface UseMapEditorOptions {
  apiBase?: string;
  chunkSize?: number;
}

/** Check if every tile in a chunk is 0 (empty) */
function isChunkEmpty(tiles: Uint16Array): boolean {
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== 0) return false;
  }
  return true;
}

export function useMapEditor(options: UseMapEditorOptions = {}) {
  const { apiBase = '/api', chunkSize = DEFAULT_CHUNK_SIZE } = options;

  // Chunk data lives in a mutable ref for performance — changes on every stroke.
  // A separate useState triggers re-renders only when chunks structurally change.
  const chunksRef = useRef<Map<ChunkKey, ChunkData>>(new Map());
  const [chunks, setChunks] = useState<Map<ChunkKey, ChunkData>>(new Map());

  const history = useEditorHistory();

  // Zustand store — UI state (tool, selectedTileId, etc.)
  const store = useEditorStore;

  // --- Trigger re-render by cloning chunks map ---
  const triggerRerender = useCallback(() => {
    setChunks(new Map(chunksRef.current));
  }, []);

  // --- Data loading ---

  const loadTiles = useCallback(async () => {
    const res = await fetch(`${apiBase}/tiles?range=${encodeURIComponent('[0,9999]')}`);
    const data: TileDef[] = await res.json();
    store.getState().setTiles(data);
    return data;
  }, [apiBase, store]);

  const loadTilesets = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/tilesets?range=${encodeURIComponent('[0,9999]')}`);
      if (res.ok) {
        const data: TilesetDef[] = await res.json();
        store.getState().setTilesets(data);
        return data;
      }
    } catch {
      // Tilesets API may not exist yet — silently ignore
    }
    return [];
  }, [apiBase, store]);

  const loadMap = useCallback(async (mapId: number) => {
    store.getState().setLoading(true);
    store.getState().setMapId(mapId);

    const res = await fetch(`${apiBase}/maps/${mapId}`);
    const map: MapRecord = await res.json();

    // Load existing chunks
    const chunksRes = await fetch(`${apiBase}/maps/${mapId}/chunks`);
    const rawChunks: ChunkRecord[] = await chunksRes.json();

    const newChunks = new Map<ChunkKey, ChunkData>();
    for (const rc of rawChunks) {
      const key = chunkKey(rc.chunkX, rc.chunkY);
      newChunks.set(key, {
        chunkX: rc.chunkX,
        chunkY: rc.chunkY,
        tiles: decodeTileData(rc.layerData),
        dirty: false,
      });
    }
    chunksRef.current = newChunks;
    history.clearHistory();

    store.getState().setMap(map);
    store.getState().setLoading(false);
    setChunks(newChunks);
    return map;
  }, [apiBase, history, store]);

  const loadChunk = useCallback(async (mapId: number, cx: number, cy: number) => {
    const key = chunkKey(cx, cy);
    if (chunksRef.current.has(key)) return chunksRef.current.get(key)!;

    const res = await fetch(`${apiBase}/maps/${mapId}/chunks?chunk_x=${cx}&chunk_y=${cy}`);
    if (!res.ok) return null;

    const rc: ChunkRecord = await res.json();
    const data: ChunkData = {
      chunkX: rc.chunkX,
      chunkY: rc.chunkY,
      tiles: decodeTileData(rc.layerData),
      dirty: false,
    };

    chunksRef.current.set(key, data);
    setChunks(prev => {
      const next = new Map(prev);
      next.set(key, data);
      return next;
    });
    return data;
  }, [apiBase]);

  // --- Stroke lifecycle (for undo/redo batching) ---

  const beginStroke = useCallback(() => {
    history.beginStroke();
  }, [history]);

  const endStroke = useCallback((type: string) => {
    history.endStroke(type as 'paint' | 'erase' | 'stamp');
  }, [history]);

  // --- Tile painting (reads tool/selectedTileId from store — no stale closures) ---

  const paintTile = useCallback((worldX: number, worldY: number) => {
    const { tool, selectedTileId } = store.getState();
    const cx = Math.floor(worldX / chunkSize);
    const cy = Math.floor(worldY / chunkSize);
    const localX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const localY = ((worldY % chunkSize) + chunkSize) % chunkSize;
    const key = chunkKey(cx, cy);

    const chunk = chunksRef.current.get(key);
    if (!chunk) return;

    const idx = localY * chunkSize + localX;
    const tileId = tool === 'erase' ? 0 : selectedTileId;

    if (chunk.tiles[idx] === tileId) return; // No change

    // Record for undo/redo
    history.recordChange({
      chunkKey: key,
      localIndex: idx,
      oldTileId: chunk.tiles[idx],
      newTileId: tileId,
    });

    chunk.tiles[idx] = tileId;
    chunk.dirty = true;

    setChunks(prev => {
      const next = new Map(prev);
      next.set(key, { ...chunk });
      return next;
    });
  }, [chunkSize, history, store]);

  // --- Stamp painting (reads activeStamp from store — no stale closures) ---

  const paintStamp = useCallback((worldX: number, worldY: number) => {
    const { activeStamp } = store.getState();
    if (!activeStamp) return;
    const stamp = activeStamp;
    const modifiedKeys = new Set<ChunkKey>();

    for (let sy = 0; sy < stamp.height; sy++) {
      for (let sx = 0; sx < stamp.width; sx++) {
        const tileId = stamp.tiles[sy * stamp.width + sx];
        if (tileId === 0) continue; // Skip empty cells in stamp

        const tx = worldX + sx;
        const ty = worldY + sy;
        const cx = Math.floor(tx / chunkSize);
        const cy = Math.floor(ty / chunkSize);
        const localX = ((tx % chunkSize) + chunkSize) % chunkSize;
        const localY = ((ty % chunkSize) + chunkSize) % chunkSize;
        const key = chunkKey(cx, cy);

        // Ensure chunk exists
        if (!chunksRef.current.has(key)) {
          const newChunk: ChunkData = {
            chunkX: cx,
            chunkY: cy,
            tiles: new Uint16Array(chunkSize * chunkSize),
            dirty: true,
          };
          chunksRef.current.set(key, newChunk);
        }

        const chunk = chunksRef.current.get(key)!;
        const idx = localY * chunkSize + localX;

        // Record for undo/redo
        history.recordChange({
          chunkKey: key,
          localIndex: idx,
          oldTileId: chunk.tiles[idx],
          newTileId: tileId,
        });

        chunk.tiles[idx] = tileId;
        chunk.dirty = true;
        modifiedKeys.add(key);
      }
    }

    // Create new chunk references for modified chunks so ChunkMesh re-renders
    setChunks(prev => {
      const next = new Map(prev);
      for (const key of modifiedKeys) {
        const chunk = chunksRef.current.get(key);
        if (chunk) next.set(key, { ...chunk });
      }
      return next;
    });
  }, [chunkSize, history, store]);

  // --- Create empty chunk for painting ---

  const ensureChunk = useCallback((cx: number, cy: number): ChunkData => {
    const key = chunkKey(cx, cy);
    let chunk = chunksRef.current.get(key);
    if (!chunk) {
      chunk = {
        chunkX: cx,
        chunkY: cy,
        tiles: new Uint16Array(chunkSize * chunkSize),
        dirty: true,
      };
      chunksRef.current.set(key, chunk);
      setChunks(prev => {
        const next = new Map(prev);
        next.set(key, chunk!);
        return next;
      });
    }
    return chunk;
  }, [chunkSize]);

  // --- Pick tile at position (eyedropper) ---

  const pickTile = useCallback((worldX: number, worldY: number): number => {
    const cx = Math.floor(worldX / chunkSize);
    const cy = Math.floor(worldY / chunkSize);
    const localX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const localY = ((worldY % chunkSize) + chunkSize) % chunkSize;
    const key = chunkKey(cx, cy);

    const chunk = chunksRef.current.get(key);
    if (!chunk) return 0;

    const idx = localY * chunkSize + localX;
    return chunk.tiles[idx];
  }, [chunkSize]);

  // --- Cursor position (store action) ---

  const setCursorPos = useCallback((worldX: number, worldY: number) => {
    if (Number.isNaN(worldX) || Number.isNaN(worldY)) {
      store.getState().setCursorPos(null);
    } else {
      store.getState().setCursorPos({ worldX, worldY });
    }
  }, [store]);

  // --- Undo/Redo (delegated to history hook) ---

  const undo = useCallback(() => {
    history.undo(chunksRef, triggerRerender);
  }, [history, triggerRerender]);

  const redo = useCallback(() => {
    history.redo(chunksRef, triggerRerender);
  }, [history, triggerRerender]);

  // --- Save dirty chunks (with auto-delete for empty) ---

  const saveDirtyChunks = useCallback(async () => {
    const { mapId } = store.getState();
    if (!mapId) return;
    store.getState().setSaving(true);

    const dirtyEntries: [ChunkKey, ChunkData][] = [];
    for (const [key, c] of chunksRef.current.entries()) {
      if (c.dirty) dirtyEntries.push([key, c]);
    }

    for (const [key, chunk] of dirtyEntries) {
      if (isChunkEmpty(chunk.tiles)) {
        // Delete empty chunk from server
        try {
          await fetch(`${apiBase}/maps/${mapId}/chunks`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chunkX: chunk.chunkX,
              chunkY: chunk.chunkY,
            }),
          });
          // Remove from local state
          chunksRef.current.delete(key);
        } catch {
          // If DELETE endpoint doesn't exist yet, just save normally
          const layerData = encodeTileData(chunk.tiles);
          await fetch(`${apiBase}/maps/${mapId}/chunks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chunkX: chunk.chunkX,
              chunkY: chunk.chunkY,
              layerData,
            }),
          });
          chunk.dirty = false;
        }
      } else {
        // Save non-empty chunk normally
        const layerData = encodeTileData(chunk.tiles);
        await fetch(`${apiBase}/maps/${mapId}/chunks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chunkX: chunk.chunkX,
            chunkY: chunk.chunkY,
            layerData,
          }),
        });
        chunk.dirty = false;
      }
    }

    store.getState().setSaving(false);
    setChunks(new Map(chunksRef.current));
  }, [apiBase, store]);

  // --- Generate map chunks via API ---

  const generateMap = useCallback(async (radius?: number) => {
    const { mapId } = store.getState();
    if (!mapId) return;
    store.getState().setLoading(true);

    const url = radius
      ? `${apiBase}/maps/${mapId}/generate?radius=${radius}`
      : `${apiBase}/maps/${mapId}/generate`;

    await fetch(url, { method: 'POST' });
    await loadMap(mapId);
  }, [apiBase, store, loadMap]);

  // --- Bounds ---

  const updateBounds = useCallback(async (bounds: MapBounds) => {
    const { mapId, map } = store.getState();
    if (!mapId) return;

    // Update local state immediately
    if (map) {
      store.getState().setMap({
        ...map,
        boundsMinX: bounds.minX,
        boundsMinY: bounds.minY,
        boundsMaxX: bounds.maxX,
        boundsMaxY: bounds.maxY,
      });
    }

    // Persist to API
    await fetch(`${apiBase}/maps/${mapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boundsMinX: bounds.minX,
        boundsMinY: bounds.minY,
        boundsMaxX: bounds.maxX,
        boundsMaxY: bounds.maxY,
      }),
    });
  }, [apiBase, store]);

  return {
    // Chunk data (rendered via useState for React reactivity)
    chunks,
    chunksRef,
    chunkSize,
    // Data loading
    loadTiles,
    loadTilesets,
    loadMap,
    loadChunk,
    // Painting
    paintTile,
    paintStamp,
    ensureChunk,
    // Save / generate
    saveDirtyChunks,
    generateMap,
    // Bounds
    updateBounds,
    // History / stroke
    beginStroke,
    endStroke,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    // Cursor
    setCursorPos,
    // Eyedropper
    pickTile,
  };
}
