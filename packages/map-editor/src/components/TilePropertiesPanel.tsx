'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { TILE_FLAG_ENTRIES, TILE_CATEGORIES } from '../types';
import type { TileDef } from '../types';

/**
 * Panel for viewing and editing tile definition properties.
 * Appears in the right sidebar when a tile is selected for inspection.
 * Edits go to PUT /api/tiles/{id} and update the Zustand store on save.
 */
export function TilePropertiesPanel({ apiBase = '/api' }: { apiBase?: string }) {
  const inspectedTileDef = useEditorStore(s => s.inspectedTileDef);
  const setInspectedTileDef = useEditorStore(s => s.setInspectedTileDef);
  const updateTileInList = useEditorStore(s => s.updateTileInList);
  const tilesets = useEditorStore(s => s.tilesets);

  // Local draft state for editing (reset when inspected tile changes)
  const [draft, setDraft] = useState<TileDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Reset draft when inspected tile changes
  useEffect(() => {
    if (inspectedTileDef) {
      setDraft({ ...inspectedTileDef });
      setError(null);
      setSaved(false);
    } else {
      setDraft(null);
    }
  }, [inspectedTileDef]);

  const handleFlagToggle = useCallback((flagValue: number) => {
    setDraft((prev: TileDef | null) => {
      if (!prev) return prev;
      const newFlags = prev.flags & flagValue ? prev.flags & ~flagValue : prev.flags | flagValue;
      return { ...prev, flags: newFlags };
    });
    setSaved(false);
  }, []);

  const handleFieldChange = useCallback((field: keyof TileDef, value: string) => {
    setDraft((prev: TileDef | null) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`${apiBase}/tiles/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          category: draft.category,
          colorHex: draft.colorHex,
          flags: draft.flags,
        }),
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      const updated = await res.json();
      // Merge server response back — server is source of truth
      const merged: TileDef = { ...draft, ...updated };
      updateTileInList(merged);
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [draft, apiBase, updateTileInList]);

  if (!draft) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Tile Properties</div>
        <div style={{ color: '#555', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>
          Right-click a tile in the palette or canvas to inspect
        </div>
      </div>
    );
  }

  // Find tileset name
  const tileset = draft.tilesetId ? tilesets.find(ts => ts.id === draft.tilesetId) : null;

  const hasChanges = inspectedTileDef && (
    draft.name !== inspectedTileDef.name ||
    draft.category !== inspectedTileDef.category ||
    draft.colorHex !== inspectedTileDef.colorHex ||
    draft.flags !== inspectedTileDef.flags
  );

  return (
    <div style={containerStyle}>
      {/* Header with close button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...headerStyle }}>
        <span>Tile Properties</span>
        <button
          onClick={() => setInspectedTileDef(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Tile ID badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: draft.colorHex.length === 9 ? draft.colorHex.slice(0, 7) : draft.colorHex,
            border: '1px solid #555',
            borderRadius: 4,
            imageRendering: 'pixelated',
            ...(tileset?.imagePath && draft.spriteX != null && draft.spriteY != null && tileset.columns
              ? {
                  background: undefined,
                  backgroundImage: `url(${tileset.imagePath})`,
                  backgroundPosition: `-${draft.spriteX * tileset.tileWidth}px -${draft.spriteY * tileset.tileHeight}px`,
                  backgroundSize: `${tileset.columns * tileset.tileWidth}px ${(tileset.rows ?? 1) * tileset.tileHeight}px`,
                }
              : {}),
          }}
        />
        <div>
          <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600 }}>{draft.name}</div>
          <div style={{ fontSize: 10, color: '#666' }}>ID: {draft.tileId}</div>
        </div>
      </div>

      {/* Name */}
      <FieldGroup label="Name">
        <input
          type="text"
          value={draft.name}
          onChange={e => handleFieldChange('name', e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      {/* Category */}
      <FieldGroup label="Category">
        <select
          value={draft.category}
          onChange={e => handleFieldChange('category', e.target.value)}
          style={inputStyle}
        >
          {TILE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </FieldGroup>

      {/* Color */}
      <FieldGroup label="Color">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="color"
            value={draft.colorHex.length === 9 ? draft.colorHex.slice(0, 7) : draft.colorHex}
            onChange={e => handleFieldChange('colorHex', e.target.value)}
            style={{ width: 28, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
          />
          <input
            type="text"
            value={draft.colorHex}
            onChange={e => handleFieldChange('colorHex', e.target.value)}
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 11 }}
          />
        </div>
      </FieldGroup>

      {/* Flags */}
      <FieldGroup label="Flags">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TILE_FLAG_ENTRIES.map(flag => (
            <label
              key={flag.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#ccc',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={(draft.flags & flag.value) !== 0}
                onChange={() => handleFlagToggle(flag.value)}
                style={{ accentColor: '#4fc3f7' }}
              />
              {flag.label}
            </label>
          ))}
        </div>
      </FieldGroup>

      {/* Sprite info (read-only) */}
      {tileset && (
        <FieldGroup label="Sprite">
          <div style={{ fontSize: 11, color: '#888' }}>
            <div>Tileset: {tileset.name}</div>
            {draft.spriteX != null && draft.spriteY != null && (
              <div>Grid: ({draft.spriteX}, {draft.spriteY})</div>
            )}
            <div>Size: {tileset.tileWidth}×{tileset.tileHeight}px</div>
          </div>
        </FieldGroup>
      )}

      {/* Save button */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: hasChanges ? '#1565c0' : '#2a2a3e',
            border: `1px solid ${hasChanges ? '#42a5f5' : '#555'}`,
            borderRadius: 4,
            color: '#fff',
            cursor: hasChanges ? 'pointer' : 'default',
            fontSize: 12,
            fontWeight: 600,
            opacity: hasChanges ? 1 : 0.5,
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 11, color: '#ff6b6b', marginTop: 6 }}>
          {error}
        </div>
      )}

      {/* Flags summary (human-readable) */}
      <div style={{ marginTop: 12, fontSize: 10, color: '#555', borderTop: '1px solid #333', paddingTop: 8 }}>
        Flags: {draft.flags === 0 ? 'None' : TILE_FLAG_ENTRIES.filter(f => draft.flags & f.value).map(f => f.label).join(', ')}
      </div>
    </div>
  );
}

// --- Field group wrapper ---

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// --- Shared styles ---

const containerStyle: React.CSSProperties = {
  padding: 10,
  fontSize: 12,
  color: '#ccc',
};

const headerStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 13,
  marginBottom: 10,
  color: '#ccc',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  background: '#2a2a3e',
  border: '1px solid #444',
  borderRadius: 3,
  color: '#ddd',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
};
