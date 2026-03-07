import type { Editor } from 'grapesjs';
import type { BlockDefinition } from './types';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { componentRegistry } from '@oven/oven-ui';

// ─── registerOvenComponents ────────────────────────────────────
// Registers all oven-ui component types and blocks with a GrapeJS
// editor instance. Leaf components render actual React output via
// renderToStaticMarkup; containers use getChildrenContainer() for
// proper nesting with header + children slot.

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

/** Layout components that are leaf nodes (not droppable containers) */
const LEAF_LAYOUT_IDS = new Set(['oven-divider']);

/** Check if a block should be treated as a container (accepts child drops) */
function isContainerBlock(block: BlockDefinition): boolean {
  return block.category === 'layout' && !LEAF_LAYOUT_IDS.has(block.id);
}

/** Build a fallback placeholder HTML for components without registry entries or render errors */
function buildFallbackHtml(label: string, typeName: string): string {
  return `<div class="oven-fallback-placeholder"><span>⬡</span> <strong>${label}</strong> <code>${typeName}</code></div>`;
}

/**
 * Extract trait values from a GrapeJS model into a props object.
 * Skips internal data/workflow traits that aren't component props.
 */
function extractTraitProps(model: any): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const traits = model.getTraits?.() || [];

  for (const trait of traits) {
    const name = trait.get?.('name') || trait.getName?.();
    const value = trait.get?.('value') ?? trait.getValue?.();

    // Skip internal traits and empty values
    if (!name || value === undefined || value === null || value === '') continue;
    if (name === 'dataSourceEndpoint' || name === 'dataSourceType' || name === 'workflowSlug') continue;

    props[name] = value;
  }

  return props;
}

/**
 * Register all oven-ui component types and blocks with a GrapeJS editor.
 * Call this during editor initialization after the editor is ready.
 *
 * - Leaf components render via renderToStaticMarkup (actual React output)
 * - Container components use header + children slot + getChildrenContainer()
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

    const isContainer = isContainerBlock(block);
    const fallback = buildFallbackHtml(block.label, block.id);

    // Register component type
    componentManager.addType(block.id, {
      isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === block.id,

      model: {
        defaults: {
          tagName: 'div',
          droppable: isContainer,
          attributes: {
            'data-oven-type': block.id,
            class: `oven-component oven-${block.category}`,
          },
          traits,
          ...(block.defaultProps || {}),
        },
        init() {
          // Re-render the view when trait values change
          this.on('change:attributes', () => {
            if (this.view?.onRender) {
              this.view.onRender({ el: this.view.el, model: this });
            }
          });
        },
      },

      view: isContainer
        ? {
            // ── Container view ─────────────────────────────────────
            // Adds a label header and a children slot; GrapeJS manages
            // child components inside the slot via getChildrenContainer().
            onRender({ el, model }: { el: HTMLElement; model: any }) {
              // Apply className trait to the container element for Tailwind styling
              const traitProps = extractTraitProps(model);
              if (traitProps.className && typeof traitProps.className === 'string') {
                const baseClasses = `oven-component oven-${block.category}`;
                el.setAttribute('class', `${baseClasses} ${traitProps.className}`);
              }

              if (!el.querySelector('.oven-container-header')) {
                const header = document.createElement('div');
                header.className = 'oven-container-header';
                header.textContent = block.label;
                el.insertBefore(header, el.firstChild);
              }
              if (!el.querySelector('.oven-children-slot')) {
                const slot = document.createElement('div');
                // CSS classes define the layout; styles injected in canvas iframe
                slot.className = `oven-children-slot oven-slot-${block.id}`;
                // Move existing child nodes into the slot
                while (el.childNodes.length > 1) {
                  slot.appendChild(el.childNodes[1]);
                }
                el.appendChild(slot);
              }
            },
            getChildrenContainer() {
              return this.el.querySelector('.oven-children-slot') || this.el;
            },
          }
        : {
            // ── Leaf view ──────────────────────────────────────────
            // Renders the actual React component to static HTML via
            // renderToStaticMarkup. Falls back to placeholder if the
            // component uses hooks or context that aren't available.
            onRender({ el, model }: { el: HTMLElement; model: any }) {
              const entry = componentRegistry[block.id];
              if (!entry) {
                el.innerHTML = fallback;
                return;
              }

              const props = extractTraitProps(model);
              try {
                el.innerHTML = renderToStaticMarkup(
                  React.createElement(entry.component, props),
                );
              } catch {
                // Components using hooks/context fail here → graceful fallback
                el.innerHTML = fallback;
              }
            },
          },
    });

    // Register block in the sidebar
    blockManager.add(block.id, {
      label: block.label,
      category: formatCategory(block.category),
      content: { type: block.id },
      media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
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
