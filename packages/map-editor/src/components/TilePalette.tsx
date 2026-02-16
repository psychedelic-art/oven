'use client';

import { useState } from 'react';
import type { TileDef, TilesetDef, StampPattern } from '../types';

interface TilePaletteProps {
  tiles: TileDef[];
  tilesets?: TilesetDef[];
  selectedTileId: number;
  onSelect: (tileId: number) => void;
  onStampSelect?: (stamp: StampPattern) => void;
  onInspectTile?: (tileDef: TileDef) => void;
}

/**
 * Build a StampPattern from a tileset's tiles.
 * Arranges tiles by their spriteX/spriteY grid positions.
 * Falls back to sequential layout if tiles lack sprite coordinates.
 */
function buildStampFromTileset(tileset: TilesetDef, tsTiles: TileDef[]): StampPattern {
  if (tsTiles.length === 0) {
    return { name: tileset.name, width: 1, height: 1, tiles: [0] };
  }

  // Try placing by spriteX/spriteY first
  const cols = tileset.columns ?? Math.max(1, ...tsTiles.map(t => (t.spriteX ?? 0) + 1));
  const rows = tileset.rows ?? Math.max(1, ...tsTiles.map(t => (t.spriteY ?? 0) + 1));
  const tiles = new Array(cols * rows).fill(0);
  let placed = 0;
  for (const t of tsTiles) {
    if (t.spriteX != null && t.spriteY != null) {
      tiles[t.spriteY * cols + t.spriteX] = t.tileId;
      placed++;
    }
  }

  if (placed > 0) {
    return { name: tileset.name, width: cols, height: rows, tiles };
  }

  // Fallback: sequential layout when no tiles have sprite coordinates
  const fallbackCols = tileset.columns ?? Math.ceil(Math.sqrt(tsTiles.length));
  const fallbackRows = Math.ceil(tsTiles.length / fallbackCols);
  const fallbackTiles = new Array(fallbackCols * fallbackRows).fill(0);
  for (let i = 0; i < tsTiles.length; i++) {
    fallbackTiles[i] = tsTiles[i].tileId;
  }
  return { name: tileset.name, width: fallbackCols, height: fallbackRows, tiles: fallbackTiles };
}

/**
 * Tile palette — clickable color swatches organized in collapsible folders.
 * Groups by tileset first, then by category within each folder.
 * Uses inline styles (no MUI dependency) for maximum portability.
 */
export function TilePalette({ tiles, tilesets = [], selectedTileId, onSelect, onStampSelect, onInspectTile }: TilePaletteProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Build tileset lookup
  const tilesetMap = new Map(tilesets.map(ts => [ts.id, ts]));

  // Group tiles: first by tileset, then by category
  const ungrouped: TileDef[] = [];
  const byTileset = new Map<number, { tileset: TilesetDef; tiles: TileDef[] }>();

  for (const t of tiles) {
    if (t.tilesetId && tilesetMap.has(t.tilesetId)) {
      const entry = byTileset.get(t.tilesetId) ?? { tileset: tilesetMap.get(t.tilesetId)!, tiles: [] };
      entry.tiles.push(t);
      byTileset.set(t.tilesetId, entry);
    } else {
      ungrouped.push(t);
    }
  }

  // Sub-group by category
  const groupByCategory = (items: TileDef[]) =>
    items.reduce<Record<string, TileDef[]>>((acc, t) => {
      (acc[t.category] ??= []).push(t);
      return acc;
    }, {});

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const renderTileButton = (t: TileDef) => {
    const isSelected = t.tileId === selectedTileId;
    const hex = t.colorHex.length === 9 ? t.colorHex.slice(0, 7) : t.colorHex;

    // Determine if we should use spritesheet rendering
    const tileset = t.tilesetId ? tilesetMap.get(t.tilesetId) : undefined;
    const useSpritesheet = tileset?.imagePath && t.spriteX != null && t.spriteY != null && tileset.columns;

    return (
      <button
        key={t.tileId}
        onClick={() => onSelect(t.tileId)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onInspectTile) onInspectTile(t);
        }}
        title={`${t.name} (ID: ${t.tileId}) — right-click to inspect`}
        style={{
          width: 32,
          height: 32,
          background: useSpritesheet ? undefined : hex,
          backgroundImage: useSpritesheet ? `url(${tileset!.imagePath})` : undefined,
          backgroundPosition: useSpritesheet
            ? `-${t.spriteX! * tileset!.tileWidth}px -${t.spriteY! * tileset!.tileHeight}px`
            : undefined,
          backgroundSize: useSpritesheet
            ? `${tileset!.columns! * tileset!.tileWidth}px ${(tileset!.rows ?? 1) * tileset!.tileHeight}px`
            : undefined,
          border: isSelected ? '2px solid #fff' : '2px solid transparent',
          borderRadius: 4,
          cursor: 'pointer',
          outline: isSelected ? '2px solid #4fc3f7' : 'none',
          outlineOffset: 1,
          position: 'relative',
          imageRendering: 'pixelated',
        }}
      >
        {!useSpritesheet && t.spritePath && (
          <img
            src={t.spritePath}
            alt={t.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 2,
              position: 'absolute',
              top: 0,
              left: 0,
              imageRendering: 'pixelated',
            }}
          />
        )}
      </button>
    );
  };

  const renderCategoryGroup = (category: string, categoryTiles: TileDef[]) => (
    <div key={category} style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase' }}>
        {category}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {categoryTiles.map(renderTileButton)}
      </div>
    </div>
  );

  const renderFolder = (
    key: string,
    label: string,
    folderTiles: TileDef[],
    tileset?: TilesetDef,
  ) => {
    const isCollapsed = collapsed.has(key);
    const categories = groupByCategory(folderTiles);

    return (
      <div key={key} style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={() => toggleCollapse(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flex: 1,
              padding: '4px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#aaa',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>
              ▼
            </span>
            {label}
            <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>{folderTiles.length}</span>
          </button>

          {/* Stamp button for tileset folders */}
          {tileset && onStampSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStampSelect(buildStampFromTileset(tileset, folderTiles));
              }}
              title={`Use "${tileset.name}" as stamp pattern`}
              style={{
                background: 'none',
                border: '1px solid #555',
                borderRadius: 3,
                cursor: 'pointer',
                color: '#4fc3f7',
                fontSize: 11,
                padding: '2px 6px',
                whiteSpace: 'nowrap',
              }}
            >
              🔲 Stamp
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ paddingLeft: 4 }}>
            {Object.entries(categories).map(([cat, catTiles]) => renderCategoryGroup(cat, catTiles))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#ccc' }}>
        Tile Palette
      </div>

      {/* Tileset folders */}
      {Array.from(byTileset.entries()).map(([id, { tileset, tiles: tsTiles }]) =>
        renderFolder(`ts-${id}`, tileset.name, tsTiles, tileset)
      )}

      {/* Ungrouped tiles */}
      {ungrouped.length > 0 && renderFolder('ungrouped', 'Ungrouped', ungrouped)}
    </div>
  );
}
