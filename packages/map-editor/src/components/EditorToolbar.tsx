'use client';

import type { EditorTool } from '../types';

interface EditorToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onSave: () => void;
  onGenerate: () => void;
  saving: boolean;
  loading: boolean;
  dirtyCount: number;
  mapMode?: string;
}

const TOOLS: { id: EditorTool; label: string; icon: string }[] = [
  { id: 'paint', label: 'Paint', icon: '🖌️' },
  { id: 'erase', label: 'Erase', icon: '🧹' },
  { id: 'pan', label: 'Pan', icon: '✋' },
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
 * Toolbar with tool selection, save button, and generate button.
 */
export function EditorToolbar({
  tool,
  onToolChange,
  onSave,
  onGenerate,
  saving,
  loading,
  dirtyCount,
  mapMode,
}: EditorToolbarProps) {
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
        <button
          key={t.id}
          onClick={() => onToolChange(t.id)}
          style={btnStyle(tool === t.id)}
          title={t.label}
        >
          {t.icon} {t.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Status */}
      {dirtyCount > 0 && (
        <span style={{ fontSize: 12, color: '#f0ad4e' }}>
          {dirtyCount} unsaved chunk{dirtyCount > 1 ? 's' : ''}
        </span>
      )}

      {/* Generate button (for discovery maps) */}
      {mapMode === 'discovery' && (
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
    </div>
  );
}
