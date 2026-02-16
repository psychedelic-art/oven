import { useState, useCallback, useRef } from 'react';
import type { TileChange, EditorAction, ChunkKey, ChunkData } from '../types';

const DEFAULT_MAX_SIZE = 100;

/**
 * Undo/redo history for the map editor.
 *
 * Uses a command pattern with stroke batching:
 * - beginStroke() starts accumulating tile changes
 * - recordChange() adds individual tile changes to the current stroke
 * - endStroke() commits all accumulated changes as a single undo action
 *
 * A paint drag across 20 tiles = 1 undo action (not 20).
 */
export function useEditorHistory(maxSize = DEFAULT_MAX_SIZE) {
  const [past, setPast] = useState<EditorAction[]>([]);
  const [future, setFuture] = useState<EditorAction[]>([]);
  const pendingChanges = useRef<TileChange[]>([]);

  /** Start accumulating changes for a new stroke */
  const beginStroke = useCallback(() => {
    pendingChanges.current = [];
  }, []);

  /** Record a single tile change within the current stroke */
  const recordChange = useCallback((change: TileChange) => {
    // Skip no-ops
    if (change.oldTileId === change.newTileId) return;
    pendingChanges.current.push(change);
  }, []);

  /** Commit the current stroke as one undo action */
  const endStroke = useCallback((type: EditorAction['type']) => {
    if (pendingChanges.current.length === 0) return;
    const action: EditorAction = {
      type,
      changes: [...pendingChanges.current],
      timestamp: Date.now(),
    };
    setPast(p => [...p.slice(-(maxSize - 1)), action]);
    setFuture([]); // New action clears redo stack
    pendingChanges.current = [];
  }, [maxSize]);

  /** Undo the last action — reverses tile changes in-place */
  const undo = useCallback((
    chunksRef: React.MutableRefObject<Map<ChunkKey, ChunkData>>,
    triggerRerender: () => void,
  ) => {
    setPast(p => {
      if (p.length === 0) return p;
      const action = p[p.length - 1];

      // Reverse changes (iterate backwards for correctness)
      for (let i = action.changes.length - 1; i >= 0; i--) {
        const change = action.changes[i];
        const chunk = chunksRef.current.get(change.chunkKey);
        if (chunk) {
          chunk.tiles[change.localIndex] = change.oldTileId;
          chunk.dirty = true;
        }
      }

      setFuture(f => [...f, action]);
      triggerRerender();
      return p.slice(0, -1);
    });
  }, []);

  /** Redo the last undone action — re-applies tile changes */
  const redo = useCallback((
    chunksRef: React.MutableRefObject<Map<ChunkKey, ChunkData>>,
    triggerRerender: () => void,
  ) => {
    setFuture(f => {
      if (f.length === 0) return f;
      const action = f[f.length - 1];

      // Re-apply changes
      for (const change of action.changes) {
        const chunk = chunksRef.current.get(change.chunkKey);
        if (chunk) {
          chunk.tiles[change.localIndex] = change.newTileId;
          chunk.dirty = true;
        }
      }

      setPast(p => [...p, action]);
      triggerRerender();
      return f.slice(0, -1);
    });
  }, []);

  /** Clear all history (e.g., on map load) */
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
    pendingChanges.current = [];
  }, []);

  return {
    past,
    future,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    beginStroke,
    recordChange,
    endStroke,
    undo,
    redo,
    clearHistory,
  };
}
