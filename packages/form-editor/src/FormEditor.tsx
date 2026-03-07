'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import grapesjs, { type Editor } from 'grapesjs';
import type { EditorConfig, EditorState } from './types';
import { registerOvenComponents } from './registerOvenComponents';
import type { ComponentNode } from '@oven/oven-ui/types';

interface FormEditorProps {
  config: EditorConfig;
}

// ─── GrapeJS → ComponentNode serializer ────────────────────────
// Converts GrapeJS internal component model to our ComponentNode format

function serializeComponent(component: any): ComponentNode {
  const attrs = component.getAttributes?.() || {};
  const traits = component.getTraits?.() || [];

  // Build props from traits
  const props: Record<string, unknown> = {};
  const bindings: Record<string, string> = {};
  let dataSource: ComponentNode['dataSource'] | undefined;
  let workflowSlug: string | undefined;

  for (const trait of traits) {
    const name = trait.get?.('name') || trait.getName?.();
    const value = trait.get?.('value') ?? trait.getValue?.();
    if (value === undefined || value === null || value === '') continue;

    if (name === 'dataSourceEndpoint' && value) {
      dataSource = dataSource || { type: 'api' };
      dataSource.endpoint = value as string;
    } else if (name === 'dataSourceType' && value !== 'none') {
      dataSource = dataSource || { type: 'api' };
      dataSource.type = value as 'api' | 'workflow' | 'static';
    } else if (name === 'workflowSlug' && value) {
      workflowSlug = value as string;
    } else {
      // Check for $.path bindings
      if (typeof value === 'string' && value.startsWith('$.')) {
        bindings[name] = value;
      } else {
        props[name] = value;
      }
    }
  }

  const type = attrs['data-oven-type'] || component.get?.('type') || 'div';
  const children = (component.components?.() || []).map(serializeComponent);

  const node: ComponentNode = {
    id: component.getId?.() || `node-${Math.random().toString(36).slice(2, 8)}`,
    type,
    props,
    ...(children.length > 0 ? { children } : {}),
    ...(Object.keys(bindings).length > 0 ? { bindings } : {}),
    ...(dataSource ? { dataSource } : {}),
  };

  // Add workflow action binding if configured
  if (workflowSlug) {
    node.actions = [{
      event: 'onClick',
      type: 'workflow',
      workflowSlug,
      inputMapping: {},
    }];
  }

  return node;
}

/**
 * GrapeJS visual form builder.
 *
 * Initializes GrapeJS with oven-ui component blocks, handles save/load
 * of the component tree as JSON, and provides trait-based property editing.
 */
export default function FormEditor({ config }: FormEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const getEditorState = useCallback((): EditorState => {
    const editor = editorRef.current;
    if (!editor) {
      return { components: [], styles: [] };
    }

    // Serialize all root-level components
    const wrapper = editor.getWrapper();
    const components = (wrapper?.components?.() || []).map(serializeComponent);

    // Get styles
    const cssComposer = editor.CssComposer;
    const styles = cssComposer?.getAll?.()?.map?.((rule: any) => ({
      selectors: rule.selectorsToString?.(),
      style: rule.getStyle?.(),
    })) || [];

    // Get full project data for GrapeJS reload
    const projectData = editor.getProjectData?.() || {};

    return { components, styles, projectData };
  }, []);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    // Initialize GrapeJS
    const editor = grapesjs.init({
      container: containerRef.current,
      fromElement: false,
      height: '100%',
      width: 'auto',
      storageManager: false, // We handle persistence ourselves
      panels: { defaults: [] },
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@4/dist/tailwind.min.css',
        ],
      },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' },
        ],
      },
    });

    editorRef.current = editor;

    // Register oven-ui components as GrapeJS blocks
    if (config.blocks && config.blocks.length > 0) {
      registerOvenComponents(editor, { blocks: config.blocks });
    }

    // Load existing definition if available
    if (config.definition?.projectData) {
      editor.loadProjectData(config.definition.projectData);
    }

    // Set up change handler
    editor.on('component:update', () => {
      config.onChange?.(getEditorState());
    });

    editor.on('component:add', () => {
      config.onChange?.(getEditorState());
    });

    editor.on('component:remove', () => {
      config.onChange?.(getEditorState());
    });

    // Add save command
    editor.Commands.add('oven-save', {
      run() {
        config.onSave?.(getEditorState());
      },
    });

    // Add save keyboard shortcut (Ctrl/Cmd + S)
    editor.Keymaps.add('oven:save', 'ctrl+s', 'oven-save');

    // Set read-only mode
    if (config.readOnly) {
      editor.setDragMode('');
    }

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, position: 'relative' }}>
      {/* GrapeJS mounts here */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
