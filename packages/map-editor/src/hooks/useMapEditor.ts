import { useState, useCallback, useRef } from 'react';
import type { MapEditorState, TileDef, MapRecord, ChunkRecord, ChunkData, EditorTool, ChunkKey } from '../types';
import { decodeTileData, encodeTileData, chunkKey } from '../codec';

const DEFAULT_CHUNK_SIZE = 32;

interface UseMapEditorOptions {
  apiBase?: string;
  chunkSize?: number;
}

export function useMapEditor(options: UseMapEditorOptions = {}) {
  const { apiBase = '/api', chunkSize = DEFAULT_CHUNK_SIZE } = options;

  const [state, setState] = useState<MapEditorState>({
    mapId: null,
    map: null,
    tiles: [],
    chunks: new Map(),
    selectedTileId: 1,
    tool: 'paint',
    chunkSize,
    zoom: 1,
    loading: false,
    saving: false,
  });

  const chunksRef = useRef<Map<ChunkKey, ChunkData>>(new Map());

  // --- Data loading ---

  const loadTiles = useCallback(async () => {
    const res = await fetch(`${apiBase}/tiles`);
    const data: TileDef[] = await res.json();
    setState(s => ({ ...s, tiles: data }));
    return data;
  }, [apiBase]);

  const loadMap = useCallback(async (mapId: number) => {
    setState(s => ({ ...s, loading: true, mapId }));
    const res = await fetch(`${apiBase}/maps/${mapId}`);
    const map: MapRecord = await res.json();

    // Load existing chunks
    const chunksRes = await fetch(`${apiBase}/maps/${mapId}/chunks`);
    const rawChunks: ChunkRecord[] = await chunksRes.json();

    const chunks = new Map<ChunkKey, ChunkData>();
    for (const rc of rawChunks) {
      const key = chunkKey(rc.chunkX, rc.chunkY);
      chunks.set(key, {
        chunkX: rc.chunkX,
        chunkY: rc.chunkY,
        tiles: decodeTileData(rc.layerData),
        dirty: false,
      });
    }
    chunksRef.current = chunks;

    setState(s => ({ ...s, map, chunks, loading: false }));
    return map;
  }, [apiBase]);

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
    setState(s => {
      const newChunks = new Map(s.chunks);
      newChunks.set(key, data);
      return { ...s, chunks: newChunks };
    });
    return data;
  }, [apiBase]);

  // --- Tile painting ---

  const paintTile = useCallback((worldX: number, worldY: number) => {
    const cx = Math.floor(worldX / chunkSize);
    const cy = Math.floor(worldY / chunkSize);
    const localX = ((worldX % chunkSize) + chunkSize) % chunkSize;
    const localY = ((worldY % chunkSize) + chunkSize) % chunkSize;
    const key = chunkKey(cx, cy);

    const chunk = chunksRef.current.get(key);
    if (!chunk) return;

    const idx = localY * chunkSize + localX;
    const tileId = state.tool === 'erase' ? 0 : state.selectedTileId;

    if (chunk.tiles[idx] === tileId) return; // No change

    chunk.tiles[idx] = tileId;
    chunk.dirty = true;

    setState(s => {
      const newChunks = new Map(s.chunks);
      newChunks.set(key, { ...chunk });
      return { ...s, chunks: newChunks };
    });
  }, [chunkSize, state.selectedTileId, state.tool]);

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
      setState(s => {
        const newChunks = new Map(s.chunks);
        newChunks.set(key, chunk!);
        return { ...s, chunks: newChunks };
      });
    }
    return chunk;
  }, [chunkSize]);

  // --- Save dirty chunks ---

  const saveDirtyChunks = useCallback(async () => {
    if (!state.mapId) return;
    setState(s => ({ ...s, saving: true }));

    const dirtyEntries = Array.from(chunksRef.current.entries())
      .filter(([, c]) => c.dirty);

    for (const [, chunk] of dirtyEntries) {
      const layerData = encodeTileData(chunk.tiles);
      await fetch(`${apiBase}/maps/${state.mapId}/chunks`, {
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

    setState(s => ({ ...s, saving: false, chunks: new Map(chunksRef.current) }));
  }, [apiBase, state.mapId]);

  // --- Generate map chunks via API ---

  const generateMap = useCallback(async (radius?: number) => {
    if (!state.mapId) return;
    setState(s => ({ ...s, loading: true }));

    const url = radius
      ? `${apiBase}/maps/${state.mapId}/generate?radius=${radius}`
      : `${apiBase}/maps/${state.mapId}/generate`;

    await fetch(url, { method: 'POST' });
    await loadMap(state.mapId);
  }, [apiBase, state.mapId, loadMap]);

  // --- Tool & selection setters ---

  const setTool = useCallback((tool: EditorTool) => {
    setState(s => ({ ...s, tool }));
  }, []);

  const setSelectedTileId = useCallback((tileId: number) => {
    setState(s => ({ ...s, selectedTileId: tileId }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(s => ({ ...s, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, []);

  return {
    state,
    loadTiles,
    loadMap,
    loadChunk,
    paintTile,
    ensureChunk,
    saveDirtyChunks,
    generateMap,
    setTool,
    setSelectedTileId,
    setZoom,
  };
}
