'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { TileMapCanvas } from './TileMapCanvas';
import { TilePalette } from './TilePalette';
import { EditorToolbar } from './EditorToolbar';
import { TilePropertiesPanel } from './TilePropertiesPanel';
import { useMapEditor } from '../hooks/useMapEditor';
import { useEditorStore } from '../store/editorStore';
import type { MapBounds, TileDef } from '../types';

interface MapEditorProps {
  mapId: number;
  apiBase?: string;
}

/**
 * Full map editor component.
 * Combines the R3F canvas, tile palette sidebar, toolbar, and status bar.
 * Reads UI state from Zustand store; chunk data from useMapEditor hook.
 */
export function MapEditor({ mapId, apiBase }: MapEditorProps) {
  const editor = useMapEditor({ apiBase });

  // Subscribe to store slices
  const tool = useEditorStore(s => s.tool);
  const selectedTileId = useEditorStore(s => s.selectedTileId);
  const tiles = useEditorStore(s => s.tiles);
  const tilesets = useEditorStore(s => s.tilesets);
  const map = useEditorStore(s => s.map);
  const loading = useEditorStore(s => s.loading);
  const boundsVisible = useEditorStore(s => s.boundsVisible);
  const activeStamp = useEditorStore(s => s.activeStamp);
  const cursorPos = useEditorStore(s => s.cursorPos);

  const inspectedTileDef = useEditorStore(s => s.inspectedTileDef);

  // Store actions
  const setTool = useEditorStore(s => s.setTool);
  const setSelectedTileId = useEditorStore(s => s.setSelectedTileId);
  const setBoundsVisible = useEditorStore(s => s.setBoundsVisible);
  const setActiveStamp = useEditorStore(s => s.setActiveStamp);
  const setInspectedTileDef = useEditorStore(s => s.setInspectedTileDef);

  // Load data on mount
  useEffect(() => {
    editor.loadTiles();
    editor.loadTilesets();
    editor.loadMap(mapId);
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirtyCount = useMemo(() => {
    let count = 0;
    for (const c of editor.chunks.values()) {
      if (c.dirty) count++;
    }
    return count;
  }, [editor.chunks]);

  // Extract bounds from map record
  const bounds: MapBounds | null = useMemo(() => {
    if (!map || map.boundsMinX == null || map.boundsMinY == null || map.boundsMaxX == null || map.boundsMaxY == null) {
      return null;
    }
    return { minX: map.boundsMinX, minY: map.boundsMinY, maxX: map.boundsMaxX, maxY: map.boundsMaxY };
  }, [map]);

  // --- Eyedropper handler: pick tile + switch to paint ---
  const handlePickTile = useCallback((worldX: number, worldY: number) => {
    const tileId = editor.pickTile(worldX, worldY);
    if (tileId > 0) {
      setSelectedTileId(tileId);
      setTool('paint');
    }
  }, [editor, setSelectedTileId, setTool]);

  // --- Inspect tile handler: right-click on canvas → open properties panel ---
  const handleInspectTile = useCallback((worldX: number, worldY: number) => {
    const tileId = editor.pickTile(worldX, worldY);
    if (tileId > 0) {
      const tileDef = tiles.find((t: TileDef) => t.tileId === tileId);
      if (tileDef) {
        setInspectedTileDef(tileDef);
      }
    }
  }, [editor, tiles, setInspectedTileDef]);

  // --- Inspect tile from palette: right-click on palette tile → open properties ---
  const handleInspectPaletteTile = useCallback((tileDef: TileDef) => {
    setInspectedTileDef(tileDef);
  }, [setInspectedTileDef]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Z -> Undo
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        editor.undo();
        return;
      }
      // Ctrl+Y or Ctrl+Shift+Z -> Redo
      if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        editor.redo();
        return;
      }
      // Ctrl+S -> Save
      if (ctrl && e.key === 's') {
        e.preventDefault();
        editor.saveDirtyChunks();
        return;
      }

      // Tool shortcuts — only when no modifier keys
      if (ctrl || e.altKey || e.shiftKey) return;

      switch (e.key.toLowerCase()) {
        case 'p':
          setTool('paint');
          break;
        case 'e':
          setTool('erase');
          break;
        case 's':
          setTool('stamp');
          break;
        case ' ':
          e.preventDefault(); // Prevent page scroll
          setTool('pan');
          break;
        case 'b':
          setBoundsVisible(!useEditorStore.getState().boundsVisible);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, setTool, setBoundsVisible]);

  // --- Unsaved changes warning (beforeunload) ---
  useEffect(() => {
    if (dirtyCount === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyCount]);

  // --- Cursor info for status bar ---
  const cursorTileX = cursorPos ? Math.floor(cursorPos.worldX) : null;
  const cursorTileY = cursorPos ? Math.floor(cursorPos.worldY) : null;
  const cursorChunkX = cursorTileX != null ? Math.floor(cursorTileX / editor.chunkSize) : null;
  const cursorChunkY = cursorTileY != null ? Math.floor(cursorTileY / editor.chunkSize) : null;

  if (loading && editor.chunks.size === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
        Loading map...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#121220' }}>
      {/* Top toolbar */}
      <EditorToolbar
        onSave={editor.saveDirtyChunks}
        onGenerate={() => editor.generateMap(2)}
        dirtyCount={dirtyCount}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar: tile palette */}
        <div
          style={{
            width: 180,
            background: '#1e1e2e',
            borderRight: '1px solid #333',
            overflowY: 'auto',
          }}
        >
          <TilePalette
            tiles={tiles}
            tilesets={tilesets}
            selectedTileId={selectedTileId}
            onSelect={setSelectedTileId}
            onStampSelect={setActiveStamp}
            onInspectTile={handleInspectPaletteTile}
          />
        </div>

        {/* Main canvas area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <TileMapCanvas
            chunks={editor.chunks}
            tiles={tiles}
            tilesets={tilesets}
            chunkSize={editor.chunkSize}
            tool={tool}
            onPaint={editor.paintTile}
            onEnsureChunk={editor.ensureChunk}
            onStampPaint={editor.paintStamp}
            onStrokeStart={editor.beginStroke}
            onStrokeEnd={editor.endStroke}
            onCursorMove={editor.setCursorPos}
            onPickTile={handlePickTile}
            onInspectTile={handleInspectTile}
            bounds={bounds}
            boundsVisible={boundsVisible}
            onBoundsChange={editor.updateBounds}
            activeStamp={activeStamp}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Status bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '4px 12px',
              fontSize: 11,
              color: '#888',
              background: 'rgba(18, 18, 32, 0.9)',
              borderTop: '1px solid #333',
              pointerEvents: 'none',
            }}
          >
            {/* Cursor position */}
            {cursorTileX != null && cursorTileY != null ? (
              <span>
                Tile: ({cursorTileX}, {cursorTileY})
              </span>
            ) : (
              <span style={{ color: '#555' }}>Tile: —</span>
            )}

            {cursorChunkX != null && cursorChunkY != null && (
              <span>
                Chunk: ({cursorChunkX}, {cursorChunkY})
              </span>
            )}

            <span style={{ color: '#555' }}>·</span>

            {/* Map info */}
            <span>{map?.name}</span>
            <span style={{ color: '#555' }}>{map?.mode}</span>
            <span>{editor.chunks.size} chunk{editor.chunks.size !== 1 ? 's' : ''}</span>
            {map?.seed != null && (
              <span style={{ color: '#555' }}>seed: {map.seed}</span>
            )}

            {/* Dirty indicator */}
            {dirtyCount > 0 && (
              <span style={{ color: '#f0ad4e', marginLeft: 'auto' }}>
                {dirtyCount} unsaved
              </span>
            )}
          </div>
        </div>

        {/* Right sidebar: tile properties panel */}
        {inspectedTileDef && (
          <div
            style={{
              width: 220,
              background: '#1e1e2e',
              borderLeft: '1px solid #333',
              overflowY: 'auto',
            }}
          >
            <TilePropertiesPanel apiBase={apiBase} />
          </div>
        )}
      </div>
    </div>
  );
}
