'use client';

import { useEditorStore } from '../store/editorStore';
import { Tooltip } from './Tooltip';
import type { EditorTool } from '../types';

interface EditorToolbarProps {
  onSave: () => void;
  onGenerate: () => void;
  dirtyCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const TOOLS: { id: EditorTool; label: string; icon: string; description: string; shortcut: string }[] = [
  { id: 'paint', label: 'Paint', icon: '🖌️', description: 'Place the selected tile on the map', shortcut: 'P' },
  { id: 'erase', label: 'Erase', icon: '🧹', description: 'Remove tiles (set to empty)', shortcut: 'E' },
  { id: 'stamp', label: 'Stamp', icon: '🔲', description: 'Place a multi-tile pattern from a tileset', shortcut: 'S' },
  { id: 'pan', label: 'Pan', icon: '✋', description: 'Drag to move the camera view', shortcut: 'Space' },
];

const btnStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  border: active ? '2px solid #4fc3f7' : '1px solid #555',
  borderRadius: 4,
  background: active ? '#1a3a5c' : '#2a2a3e',
  color: active ? '#fff' : '#ccc',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
});

/**
 * Toolbar with tool selection, undo/redo, save button, generate button, and bounds toggle.
 * Subscribes to Zustand store for tool, bounds, stamp, and map state.
 */
export function EditorToolbar({
  onSave,
  onGenerate,
  dirtyCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  // Subscribe to store slices
  const tool = useEditorStore(s => s.tool);
  const boundsVisible = useEditorStore(s => s.boundsVisible);
  const activeStamp = useEditorStore(s => s.activeStamp);
  const map = useEditorStore(s => s.map);
  const loading = useEditorStore(s => s.loading);
  const saving = useEditorStore(s => s.saving);

  // Store actions
  const setTool = useEditorStore(s => s.setTool);
  const setBoundsVisible = useEditorStore(s => s.setBoundsVisible);
  const setActiveStamp = useEditorStore(s => s.setActiveStamp);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#1e1e2e',
        borderBottom: '1px solid #333',
      }}
    >
      {/* Tool buttons */}
      {TOOLS.map((t) => (
        <Tooltip key={t.id} text={t.description} shortcut={t.shortcut}>
          <button
            onClick={() => setTool(t.id)}
            style={btnStyle(tool === t.id)}
          >
            {t.icon} {t.label}
          </button>
        </Tooltip>
      ))}

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: '#444', margin: '0 4px' }} />

      {/* Undo / Redo */}
      {onUndo && onRedo && (
        <>
          <Tooltip text="Undo last action" shortcut="Ctrl+Z">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              style={{
                ...btnStyle(false),
                opacity: canUndo ? 1 : 0.35,
                padding: '6px 8px',
              }}
            >
              ↩
            </button>
          </Tooltip>
          <Tooltip text="Redo last undone action" shortcut="Ctrl+Y">
            <button
              onClick={onRedo}
              disabled={!canRedo}
              style={{
                ...btnStyle(false),
                opacity: canRedo ? 1 : 0.35,
                padding: '6px 8px',
              }}
            >
              ↪
            </button>
          </Tooltip>
        </>
      )}

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: '#444', margin: '0 4px' }} />

      {/* Bounds visibility toggle */}
      <Tooltip text="Show/hide map boundary overlay" shortcut="B">
        <button
          onClick={() => setBoundsVisible(!boundsVisible)}
          style={{
            ...btnStyle(!!boundsVisible),
            background: boundsVisible ? '#004d5a' : '#2a2a3e',
            borderColor: boundsVisible ? '#00e5ff' : '#555',
          }}
        >
          {boundsVisible ? '👁' : '👁‍🗨'} Bounds
        </button>
      </Tooltip>

      {/* Active stamp info + clear */}
      {tool === 'stamp' && activeStamp && (
        <span style={{ fontSize: 12, color: '#4fc3f7', display: 'flex', alignItems: 'center', gap: 4 }}>
          Stamp: {activeStamp.name} ({activeStamp.width}x{activeStamp.height})
          <button
            onClick={() => setActiveStamp(null)}
            title="Clear stamp"
            style={{
              background: 'none',
              border: '1px solid #555',
              borderRadius: 3,
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: 11,
              padding: '1px 5px',
            }}
          >
            ✕
          </button>
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Status */}
      {dirtyCount > 0 && (
        <span style={{ fontSize: 12, color: '#f0ad4e' }}>
          {dirtyCount} unsaved chunk{dirtyCount > 1 ? 's' : ''}
        </span>
      )}

      {/* Generate button (for discovery maps) */}
      {map?.mode === 'discovery' && (
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            ...btnStyle(false),
            background: '#2d5a1e',
            borderColor: '#4a8a2e',
          }}
        >
          {loading ? 'Generating...' : 'Generate Chunks'}
        </button>
      )}

      {/* Save button */}
      <Tooltip text="Save all unsaved changes" shortcut="Ctrl+S">
        <button
          onClick={onSave}
          disabled={saving || dirtyCount === 0}
          style={{
            ...btnStyle(false),
            background: dirtyCount > 0 ? '#1565c0' : '#2a2a3e',
            borderColor: dirtyCount > 0 ? '#42a5f5' : '#555',
            opacity: dirtyCount === 0 ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </Tooltip>
    </div>
  );
}
