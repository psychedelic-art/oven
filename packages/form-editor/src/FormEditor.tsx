'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';
import grapesjs, { type Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
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

  const type = component.get?.('type') || attrs['data-oven-type'] || 'div';
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
 * Convert a ComponentNode tree into HTML that GrapeJS can parse.
 * This is the inverse of serializeComponent — used when loading seed data
 * that only has our ComponentNode[] format but no GrapeJS projectData.
 */
function componentNodesToHtml(nodes: ComponentNode[]): string {
  return nodes.map(nodeToHtml).join('\n');
}

function nodeToHtml(node: ComponentNode): string {
  // Build attribute string from props
  const attrs: string[] = [`data-gjs-type="${node.type}"`, `data-oven-type="${node.type}"`];
  if (node.props) {
    for (const [key, value] of Object.entries(node.props)) {
      if (value === undefined || value === null) continue;
      // Convert React className to HTML class attribute
      const attrName = key === 'className' ? 'class' : key;
      if (typeof value === 'object') {
        attrs.push(`data-prop-${attrName}="${encodeURIComponent(JSON.stringify(value))}"`);
      } else {
        attrs.push(`${attrName}="${String(value).replace(/"/g, '&quot;')}"`);
      }
    }
  }

  const childrenHtml = node.children ? componentNodesToHtml(node.children) : '';
  return `<div ${attrs.join(' ')}>${childrenHtml}</div>`;
}

/** Register built-in HTML/form blocks so the editor is usable even without API blocks */
function registerBuiltinBlocks(editor: Editor): void {
  const bm = editor.BlockManager;

  bm.add('text', {
    label: 'Text',
    category: '📄 Basic',
    content: '<div data-gjs-type="text">Insert your text here</div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
  });

  bm.add('heading', {
    label: 'Heading',
    category: '📄 Basic',
    content: '<h2 data-gjs-type="text">Heading</h2>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
  });

  bm.add('image', {
    label: 'Image',
    category: '📄 Basic',
    content: { type: 'image' },
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  });

  bm.add('link', {
    label: 'Link',
    category: '📄 Basic',
    content: '<a href="#" data-gjs-type="link">Link text</a>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  });

  bm.add('video', {
    label: 'Video',
    category: '📄 Basic',
    content: { type: 'video' },
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
  });

  bm.add('section', {
    label: 'Section',
    category: '📐 Layout',
    content: '<section style="padding:40px 20px;min-height:100px"></section>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/></svg>',
  });

  bm.add('columns-2', {
    label: '2 Columns',
    category: '📐 Layout',
    content: '<div style="display:flex;gap:16px;padding:10px"><div style="flex:1;min-height:60px;padding:10px"></div><div style="flex:1;min-height:60px;padding:10px"></div></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M3 3h8v18H3V3zm10 0h8v18h-8V3z"/></svg>',
  });

  bm.add('columns-3', {
    label: '3 Columns',
    category: '📐 Layout',
    content: '<div style="display:flex;gap:16px;padding:10px"><div style="flex:1;min-height:60px;padding:10px"></div><div style="flex:1;min-height:60px;padding:10px"></div><div style="flex:1;min-height:60px;padding:10px"></div></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M2 3h6v18H2V3zm7 0h6v18H9V3zm7 0h6v18h-6V3z"/></svg>',
  });

  bm.add('form-input', {
    label: 'Text Input',
    category: '📝 Form',
    content: '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:4px;font-size:14px">Label</label><input type="text" placeholder="Enter text..." style="width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px"/></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>',
  });

  bm.add('form-textarea', {
    label: 'Textarea',
    category: '📝 Form',
    content: '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:4px;font-size:14px">Label</label><textarea placeholder="Enter text..." rows="4" style="width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;resize:vertical"></textarea></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zM6 6h12v2H6zm0 4h12v2H6zm0 4h8v2H6z"/></svg>',
  });

  bm.add('form-select', {
    label: 'Select',
    category: '📝 Form',
    content: '<div style="margin-bottom:12px"><label style="display:block;margin-bottom:4px;font-size:14px">Label</label><select style="width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px"><option value="">Choose...</option><option value="1">Option 1</option><option value="2">Option 2</option></select></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
  });

  bm.add('form-checkbox', {
    label: 'Checkbox',
    category: '📝 Form',
    content: '<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="cb1"/><label for="cb1" style="font-size:14px">Checkbox label</label></div>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  });

  bm.add('form-button', {
    label: 'Button',
    category: '📝 Form',
    content: '<button type="submit" style="padding:10px 24px;background:#1976d2;color:white;border:none;border-radius:4px;font-size:14px;cursor:pointer">Submit</button>',
    media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z"/></svg>',
  });
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
      canvas: {
        scripts: [
          'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
        ],
      },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' },
        ],
      },
      styleManager: {
        sectors: [
          {
            name: 'Layout',
            open: false,
            properties: [
              'display', 'flex-direction', 'flex-wrap', 'justify-content',
              'align-items', 'align-content', 'order', 'flex-basis',
              'flex-grow', 'flex-shrink', 'align-self',
            ],
          },
          {
            name: 'Dimension',
            open: false,
            properties: [
              'width', 'min-width', 'max-width',
              'height', 'min-height', 'max-height',
              'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
              'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            ],
          },
          {
            name: 'Typography',
            open: false,
            properties: [
              'font-family', 'font-size', 'font-weight', 'letter-spacing',
              'color', 'line-height', 'text-align', 'text-decoration',
              'text-transform', 'text-shadow',
            ],
          },
          {
            name: 'Decorations',
            open: false,
            properties: [
              'background-color', 'border-radius',
              'border', 'border-width', 'border-style', 'border-color',
              'box-shadow', 'opacity',
            ],
          },
        ],
      },
    });

    editorRef.current = editor;

    // Inject CSS into the canvas iframe for container/slot styling
    editor.on('canvas:frame:load', () => {
      const canvasDoc = editor.Canvas.getDocument();
      if (!canvasDoc) return;

      // Tailwind v4 browser CDN requires an @import trigger style
      if (!canvasDoc.getElementById('oven-tw-trigger')) {
        const twStyle = canvasDoc.createElement('style');
        twStyle.id = 'oven-tw-trigger';
        twStyle.textContent = '@import "tailwindcss";';
        canvasDoc.head.appendChild(twStyle);
      }

      if (canvasDoc.getElementById('oven-canvas-styles')) return;
      const styleEl = canvasDoc.createElement('style');
      styleEl.id = 'oven-canvas-styles';
      styleEl.textContent = `
        .oven-container-header {
          padding: 4px 8px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          font: 12px sans-serif;
          color: #666;
        }
        .oven-children-slot {
          padding: 8px;
          min-height: 60px;
        }
        .oven-slot-oven-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .oven-slot-oven-grid-3col {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        .oven-children-slot:empty::after {
          content: 'Drop components here';
          display: block;
          text-align: center;
          padding: 20px;
          color: #999;
          font: 13px sans-serif;
          border: 2px dashed #ddd;
          border-radius: 4px;
        }
        .oven-fallback-placeholder {
          padding: 12px 16px;
          border: 1px dashed #ccc;
          border-radius: 6px;
          background: #fafafa;
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          font-family: sans-serif;
          font-size: 13px;
          color: #666;
        }
        .oven-fallback-placeholder code {
          font-size: 11px;
          color: #999;
        }
      `;
      canvasDoc.head.appendChild(styleEl);
    });

    // Register built-in HTML/form blocks (always available)
    registerBuiltinBlocks(editor);

    // Register oven-ui components as GrapeJS blocks
    if (config.blocks && config.blocks.length > 0) {
      registerOvenComponents(editor, { blocks: config.blocks });
    }

    // Load existing definition if available
    if (config.definition?.projectData) {
      // Preferred: reload from GrapeJS native project data (saved after first edit)
      editor.loadProjectData(config.definition.projectData);
    } else if (config.definition?.components && config.definition.components.length > 0) {
      // Fallback: convert ComponentNode[] tree to HTML (seed data / first load)
      const html = componentNodesToHtml(config.definition.components);
      editor.setComponents(html);
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
    <Box sx={{ width: '100%', height: '100%', minHeight: 500, position: 'relative' }}>
      {/* GrapeJS mounts here */}
      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
    </Box>
  );
}
