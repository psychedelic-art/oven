'use client';

import React from 'react';
import type { EditorConfig } from './types';

interface FormEditorProps {
  config: EditorConfig;
}

/**
 * GrapeJS visual editor wrapper.
 *
 * This is a scaffold component. The full implementation will:
 * 1. Initialize GrapeJS with OVEN-specific plugins and blocks
 * 2. Load the form definition into the editor canvas
 * 3. Provide sidebar panels for components, data sources, and styles
 * 4. Handle save/publish/preview actions
 * 5. Emit onChange callbacks with the editor state
 *
 * For now it renders a placeholder that shows the editor will go here.
 */
export default function FormEditor({ config }: FormEditorProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #ccc',
        borderRadius: 8,
        backgroundColor: '#fafafa',
        color: '#666',
        fontSize: 16,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>GrapeJS Editor</div>
        <div>Visual form builder will be initialized here.</div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
          {config.readOnly ? 'Preview Mode' : 'Edit Mode'}
          {config.blocks ? ` — ${config.blocks.length} blocks available` : ''}
        </div>
      </div>
    </div>
  );
}
