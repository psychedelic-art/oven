import type { Editor } from 'grapesjs';
import type { BlockDefinition } from './types';

// ─── registerOvenComponents ────────────────────────────────────
// Registers all oven-ui component types and blocks with a GrapeJS
// editor instance. Each component type gets traits from its data
// contract, enabling property editing in the GrapeJS sidebar.

interface RegisterOptions {
  /** Block definitions from the form_components API */
  blocks: BlockDefinition[];
}

/** Map data contract types to GrapeJS trait types */
function contractTypeToTraitType(type: string): string {
  switch (type) {
    case 'boolean': return 'checkbox';
    case 'number': return 'number';
    case 'object':
    case 'array': return 'text'; // JSON as text
    default: return 'text';
  }
}

/**
 * Register all oven-ui component types and blocks with a GrapeJS editor.
 * Call this during editor initialization after the editor is ready.
 */
export function registerOvenComponents(editor: Editor, options: RegisterOptions): void {
  const { blocks } = options;
  const blockManager = editor.BlockManager;
  const componentManager = editor.Components;

  for (const block of blocks) {
    // Build traits from data contract inputs
    const traits: Array<Record<string, unknown>> = [];

    if (block.dataContract?.inputs) {
      for (const input of block.dataContract.inputs) {
        // Skip complex types that need special handling
        if (input.name === 'dataSource' || input.name === 'children') continue;

        traits.push({
          name: input.name,
          label: input.name.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()),
          type: contractTypeToTraitType(input.type),
          ...(input.defaultValue !== undefined ? { default: input.defaultValue } : {}),
          ...(input.description ? { placeholder: input.description } : {}),
        });
      }
    }

    // Add common traits for data source and workflow bindings
    traits.push(
      { name: 'dataSourceEndpoint', label: 'Data Source Endpoint', type: 'text', category: 'Data' },
      { name: 'dataSourceType', label: 'Data Source Type', type: 'select', options: [
        { id: 'none', name: 'None' },
        { id: 'api', name: 'API Endpoint' },
        { id: 'workflow', name: 'Workflow' },
        { id: 'static', name: 'Static Data' },
      ], default: 'none', category: 'Data' },
      { name: 'workflowSlug', label: 'Workflow Slug', type: 'text', category: 'Actions' },
    );

    // Register component type
    componentManager.addType(block.id, {
      isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === block.id,
      model: {
        defaults: {
          tagName: 'div',
          droppable: block.category === 'layout',
          attributes: {
            'data-oven-type': block.id,
            class: `oven-component oven-${block.category}`,
          },
          traits,
          ...(block.defaultProps || {}),
        },
      },
      view: {
        // Render a visible placeholder in the editor canvas
        onRender({ el, model }: { el: HTMLElement; model: any }) {
          const icon = block.icon || 'widgets';
          const label = block.label;
          const typeName = block.id;
          el.innerHTML = `
            <div style="
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
            ">
              <span style="font-size: 18px;">⬡</span>
              <span><strong>${label}</strong> <code style="font-size: 11px; color: #999;">${typeName}</code></span>
            </div>
          `;
        },
      },
    });

    // Register block in the sidebar
    blockManager.add(block.id, {
      label: block.label,
      category: formatCategory(block.category),
      content: { type: block.id },
      media: `<span style="font-size: 28px;">⬡</span>`,
      attributes: { class: `gjs-block-${block.id}` },
    });
  }
}

/** Format category slug to display label */
function formatCategory(category: string): string {
  const map: Record<string, string> = {
    'inputs': '📝 Inputs',
    'data-display': '📊 Data Display',
    'layout': '📐 Layout',
    'actions': '⚡ Actions',
    'navigation': '🧭 Navigation',
    'content': '📄 Content',
  };
  return map[category] || category;
}
