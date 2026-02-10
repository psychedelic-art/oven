'use client';

import { useEffect, useMemo } from 'react';
import { TileMapCanvas } from './TileMapCanvas';
import { TilePalette } from './TilePalette';
import { EditorToolbar } from './EditorToolbar';
import { useMapEditor } from '../hooks/useMapEditor';

interface MapEditorProps {
  mapId: number;
  apiBase?: string;
}

/**
 * Full map editor component.
 * Combines the R3F canvas, tile palette sidebar, and toolbar.
 */
export function MapEditor({ mapId, apiBase }: MapEditorProps) {
  const editor = useMapEditor({ apiBase });
  const { state } = editor;

  // Load data on mount
  useEffect(() => {
    editor.loadTiles();
    editor.loadMap(mapId);
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirtyCount = useMemo(
    () => Array.from(state.chunks.values()).filter((c) => c.dirty).length,
    [state.chunks]
  );

  if (state.loading && state.chunks.size === 0) {
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
        tool={state.tool}
        onToolChange={editor.setTool}
        onSave={editor.saveDirtyChunks}
        onGenerate={() => editor.generateMap(2)}
        saving={state.saving}
        loading={state.loading}
        dirtyCount={dirtyCount}
        mapMode={state.map?.mode}
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
            tiles={state.tiles}
            selectedTileId={state.selectedTileId}
            onSelect={editor.setSelectedTileId}
          />
        </div>

        {/* Main canvas area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <TileMapCanvas
            chunks={state.chunks}
            tiles={state.tiles}
            chunkSize={state.chunkSize}
            tool={state.tool}
            onPaint={editor.paintTile}
            onEnsureChunk={editor.ensureChunk}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Map info overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 196,
              fontSize: 11,
              color: '#666',
              pointerEvents: 'none',
            }}
          >
            {state.map?.name} &middot; {state.map?.mode} &middot; {state.chunks.size} chunks
            {state.map?.seed != null && ` · seed: ${state.map.seed}`}
          </div>
        </div>
      </div>
    </div>
  );
}
