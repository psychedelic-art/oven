'use client';

import type { TileDef } from '../types';

interface TilePaletteProps {
  tiles: TileDef[];
  selectedTileId: number;
  onSelect: (tileId: number) => void;
}

/**
 * Tile palette — clickable color swatches for selecting the paint tile.
 * Uses inline styles (no MUI dependency) for maximum portability.
 */
export function TilePalette({ tiles, selectedTileId, onSelect }: TilePaletteProps) {
  // Group by category
  const grouped = tiles.reduce<Record<string, TileDef[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#ccc' }}>
        Tile Palette
      </div>
      {Object.entries(grouped).map(([category, categoryTiles]) => (
        <div key={category} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>
            {category}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {categoryTiles.map((t) => {
              const isSelected = t.tileId === selectedTileId;
              const hex = t.colorHex.length === 9 ? t.colorHex.slice(0, 7) : t.colorHex;
              return (
                <button
                  key={t.tileId}
                  onClick={() => onSelect(t.tileId)}
                  title={`${t.name} (ID: ${t.tileId})`}
                  style={{
                    width: 32,
                    height: 32,
                    background: hex,
                    border: isSelected ? '2px solid #fff' : '2px solid transparent',
                    borderRadius: 4,
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid #4fc3f7' : 'none',
                    outlineOffset: 1,
                    position: 'relative',
                  }}
                >
                  {t.spritePath && (
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
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
