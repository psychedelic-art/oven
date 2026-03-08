import type { Editor } from 'grapesjs';
import type { BlockDefinition, DiscoveryData } from './types';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { componentRegistry } from '@oven/oven-ui';

// ─── registerOvenComponents ────────────────────────────────────
// Registers all oven-ui component types and blocks with a GrapeJS
// editor instance.
//
// Component categories in GrapeJS:
// 1. Grid Rows  — flex containers that only accept oven-grid-cell children
// 2. Grid Cells — droppable column slots inside grid rows
// 3. Containers — generic layout wrappers with header + children slot
// 4. Leaves     — static-rendered React components (inputs, cards, etc.)

interface RegisterOptions {
  /** Block definitions from the form_components API */
  blocks: BlockDefinition[];
  /** Discovery data for dynamic trait dropdowns */
  discovery?: DiscoveryData;
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

/** Grid row components — these use the Row → Cell pattern */
const GRID_ROW_IDS: Record<string, number> = {
  'oven-grid-2col': 2,
  'oven-grid-3col': 3,
};

/** Grid cell component ID */
const GRID_CELL_ID = 'oven-grid-cell';

/** Layout components that are leaf nodes (not droppable containers) */
const LEAF_LAYOUT_IDS = new Set(['oven-divider']);

/** Check if a block should be treated as a regular container */
function isContainerBlock(block: BlockDefinition): boolean {
  return (
    block.category === 'layout' &&
    !LEAF_LAYOUT_IDS.has(block.id) &&
    !(block.id in GRID_ROW_IDS) &&
    block.id !== GRID_CELL_ID
  );
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
    // Skip data/workflow internal traits — they're serialized separately
    if (
      name === 'dataSourceEndpoint' || name === 'dataSourceType' ||
      name === 'dataSourceMethod' || name === 'dataSourceHeaders' ||
      name === 'dataSourceAuthType' || name === 'dataSourceAuthValue' ||
      name === 'dataSourceBody' || name === 'workflowSlug'
    ) continue;

    props[name] = value;
  }

  return props;
}

/**
 * Extract user-defined CSS classes from a GrapeJS model, filtering out
 * GrapeJS internal classes (gjs-*). Used as a fallback when className
 * isn't available as a trait value.
 */
function extractUserClasses(model: any): string {
  return (model.getClasses?.() || [])
    .filter((c: string) => !c.startsWith('gjs-'))
    .join(' ');
}

/**
 * Force Tailwind v4 CDN MutationObserver to rescan an element.
 * Container/grid onRender() manipulates the DOM directly, which may
 * fire outside the observer window. This triggers a no-op class toggle
 * via requestAnimationFrame to force a rescan.
 */
function triggerTailwindRescan(el: HTMLElement): void {
  requestAnimationFrame(() => {
    el.classList.add('__tw');
    el.classList.remove('__tw');
  });
}

/** Build traits array from a block's data contract */
function buildTraits(block: BlockDefinition, discovery?: DiscoveryData): Array<Record<string, unknown>> {
  const traits: Array<Record<string, unknown>> = [];

  if (block.dataContract?.inputs) {
    for (const input of block.dataContract.inputs) {
      // Skip complex types that need special handling
      if (input.name === 'dataSource' || input.name === 'children') continue;

      traits.push({
        name: input.name,
        label: input.name.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()),
        type: input.options ? 'select' : contractTypeToTraitType(input.type),
        ...(input.options ? { options: input.options } : {}),
        ...(input.defaultValue !== undefined ? { default: input.defaultValue } : {}),
        ...(input.description ? { placeholder: input.description } : {}),
      });
    }
  }

  // ── Data binding traits ─────────────────────────────────────
  traits.push({
    name: 'dataSourceType', label: 'Data Source Type', type: 'select', options: [
      { id: 'none', name: 'None' },
      { id: 'api', name: 'API Endpoint' },
      { id: 'workflow', name: 'Workflow' },
      { id: 'static', name: 'Static Data' },
    ], default: 'none', category: 'Data',
  });

  // Data Source Endpoint — dropdown when discovery data available, text fallback
  if (discovery?.apiEndpoints?.length) {
    traits.push({
      name: 'dataSourceEndpoint', label: 'Data Source', type: 'select',
      options: [
        { id: '', name: 'None' },
        ...discovery.apiEndpoints.map(e => ({
          id: `${e.method} /api/${e.route}`,
          name: `${e.method} ${e.module}/${e.route}`,
        })),
      ],
      default: '', category: 'Data',
    });
  } else {
    traits.push({ name: 'dataSourceEndpoint', label: 'Data Source Endpoint', type: 'text', category: 'Data' });
  }

  // Advanced API traits (method, headers, auth)
  traits.push(
    { name: 'dataSourceMethod', label: 'HTTP Method', type: 'select', options: [
      { id: 'GET', name: 'GET' },
      { id: 'POST', name: 'POST' },
      { id: 'PUT', name: 'PUT' },
      { id: 'DELETE', name: 'DELETE' },
    ], default: 'GET', category: 'Data' },
    { name: 'dataSourceHeaders', label: 'Headers (JSON)', type: 'text', category: 'Data' },
    { name: 'dataSourceAuthType', label: 'Auth Type', type: 'select', options: [
      { id: 'none', name: 'None' },
      { id: 'bearer', name: 'Bearer Token' },
      { id: 'basic', name: 'Basic Auth' },
      { id: 'api-key', name: 'API Key' },
    ], default: 'none', category: 'Data' },
    { name: 'dataSourceAuthValue', label: 'Auth Value', type: 'text', category: 'Data' },
    { name: 'dataSourceBody', label: 'Request Body (JSON)', type: 'text', category: 'Data' },
  );

  // ── Workflow action trait ──────────────────────────────────
  if (discovery?.workflows?.length) {
    traits.push({
      name: 'workflowSlug', label: 'Workflow', type: 'select',
      options: [
        { id: '', name: 'None' },
        ...discovery.workflows.map(w => ({ id: w.slug, name: w.name })),
      ],
      default: '', category: 'Actions',
    });
  } else {
    traits.push({ name: 'workflowSlug', label: 'Workflow Slug', type: 'text', category: 'Actions' });
  }

  return traits;
}

/**
 * Register all oven-ui component types and blocks with a GrapeJS editor.
 * Call this during editor initialization after the editor is ready.
 *
 * - Grid rows use the Row → Cell pattern (flex container + droppable cells)
 * - Grid cells are individually droppable column slots
 * - Regular containers use header + children slot + getChildrenContainer()
 * - Leaf components render via renderToStaticMarkup (actual React output)
 */
export function registerOvenComponents(editor: Editor, options: RegisterOptions): void {
  const { blocks, discovery } = options;
  const blockManager = editor.BlockManager;
  const componentManager = editor.Components;

  // ── Register grid cell type first (rows reference it) ──────────
  registerGridCell(componentManager);

  for (const block of blocks) {
    const traits = buildTraits(block, discovery);
    const fallback = buildFallbackHtml(block.label, block.id);
    const columnCount = GRID_ROW_IDS[block.id];

    if (columnCount) {
      // ── Grid Row ─────────────────────────────────────────────
      registerGridRow(componentManager, block, traits, columnCount);

      // Block content spawns row + N cells
      const cellComponents = Array.from({ length: columnCount }, () => ({
        type: GRID_CELL_ID,
      }));

      blockManager.add(block.id, {
        label: block.label,
        category: formatCategory(block.category),
        content: { type: block.id, components: cellComponents },
        media: columnCount === 2
          ? '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M3 3h8v18H3V3zm10 0h8v18h-8V3z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M2 3h6v18H2V3zm7 0h6v18H9V3zm7 0h6v18h-6V3z"/></svg>',
        attributes: { class: `gjs-block-${block.id}` },
      });
    } else if (block.id === GRID_CELL_ID) {
      // Skip — cell is registered above, no sidebar block for it
      continue;
    } else if (isContainerBlock(block)) {
      // ── Regular Container ────────────────────────────────────
      registerContainer(componentManager, block, traits);

      blockManager.add(block.id, {
        label: block.label,
        category: formatCategory(block.category),
        content: { type: block.id },
        media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
        attributes: { class: `gjs-block-${block.id}` },
      });
    } else {
      // ── Leaf Component ───────────────────────────────────────
      registerLeaf(componentManager, block, traits, fallback);

      blockManager.add(block.id, {
        label: block.label,
        category: formatCategory(block.category),
        content: { type: block.id },
        media: '<svg viewBox="0 0 24 24" width="28"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
        attributes: { class: `gjs-block-${block.id}` },
      });
    }
  }
}

// ─── Grid Cell Registration ──────────────────────────────────────
// Each cell is a droppable slot inside a grid row. Users drop their
// components into cells. Cells can't be dragged out or deleted.

function registerGridCell(componentManager: any): void {
  componentManager.addType(GRID_CELL_ID, {
    isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === GRID_CELL_ID,

    model: {
      defaults: {
        tagName: 'div',
        droppable: true,       // Accepts any component
        draggable: false,      // Can't be dragged out of the row
        removable: false,      // Can't be deleted
        copyable: false,       // Can't be duplicated
        selectable: true,
        hoverable: true,
        attributes: {
          'data-oven-type': GRID_CELL_ID,
          class: 'oven-grid-cell',
        },
        traits: [
          { name: 'className', label: 'Class Name', type: 'text' },
        ],
      },
    },

    view: {
      onRender({ el, model }: { el: HTMLElement; model: any }) {
        // Apply className trait
        const traitProps = extractTraitProps(model);
        if (traitProps.className && typeof traitProps.className === 'string') {
          el.setAttribute('class', `oven-grid-cell ${traitProps.className}`);
        }
        triggerTailwindRescan(el);
      },
    },
  });
}

// ─── Grid Row Registration ───────────────────────────────────────
// Grid rows are flex containers that only accept oven-grid-cell children.
// They auto-create the correct number of cells when dropped from sidebar.

function registerGridRow(
  componentManager: any,
  block: BlockDefinition,
  traits: Array<Record<string, unknown>>,
  _columnCount: number,
): void {
  componentManager.addType(block.id, {
    isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === block.id,

    model: {
      defaults: {
        tagName: 'div',
        // Only accept grid cells as direct children
        droppable: `[data-oven-type="${GRID_CELL_ID}"]`,
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

    view: {
      onRender({ el, model }: { el: HTMLElement; model: any }) {
        // Apply className trait to the row element (with fallback to model classes)
        const traitProps = extractTraitProps(model);
        if (!traitProps.className) {
          const classes = extractUserClasses(model);
          if (classes) traitProps.className = classes;
        }
        if (traitProps.className && typeof traitProps.className === 'string') {
          const baseClasses = `oven-component oven-${block.category}`;
          el.setAttribute('class', `${baseClasses} ${traitProps.className}`);
        }

        // Add a subtle label in the top-left corner
        if (!el.querySelector('.oven-row-label')) {
          const label = document.createElement('div');
          label.className = 'oven-row-label';
          label.textContent = block.label;
          el.insertBefore(label, el.firstChild);
        }
        triggerTailwindRescan(el);
      },
    },
  });
}

// ─── Regular Container Registration ──────────────────────────────
// Containers like oven-container, oven-tabs-container, oven-accordion

function registerContainer(
  componentManager: any,
  block: BlockDefinition,
  traits: Array<Record<string, unknown>>,
): void {
  componentManager.addType(block.id, {
    isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === block.id,

    model: {
      defaults: {
        tagName: 'div',
        droppable: true,
        attributes: {
          'data-oven-type': block.id,
          class: `oven-component oven-${block.category}`,
        },
        traits,
        ...(block.defaultProps || {}),
      },
      init() {
        this.on('change:attributes', () => {
          if (this.view?.onRender) {
            this.view.onRender({ el: this.view.el, model: this });
          }
        });
      },
    },

    view: {
      onRender({ el, model }: { el: HTMLElement; model: any }) {
        // Apply className trait to the container element for Tailwind styling (with fallback)
        const traitProps = extractTraitProps(model);
        if (!traitProps.className) {
          const classes = extractUserClasses(model);
          if (classes) traitProps.className = classes;
        }
        if (traitProps.className && typeof traitProps.className === 'string') {
          const baseClasses = `oven-component oven-${block.category}`;
          el.setAttribute('class', `${baseClasses} ${traitProps.className}`);
        }

        // Hero panel: apply background image and overlay in editor canvas
        if (block.id === 'oven-hero-panel') {
          const bgImage = traitProps.backgroundImage;
          if (bgImage && typeof bgImage === 'string') {
            el.style.setProperty('--hero-bg-image', `url(${bgImage})`);
            el.style.backgroundImage = 'var(--hero-bg-image)';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
          }
          const overlay = traitProps.overlay as string;
          if (overlay && overlay !== 'none') {
            if (!el.querySelector('.oven-hero-overlay')) {
              const overlayEl = document.createElement('div');
              overlayEl.className = 'oven-hero-overlay';
              el.insertBefore(overlayEl, el.firstChild);
            }
          } else {
            const existingOverlay = el.querySelector('.oven-hero-overlay');
            if (existingOverlay) existingOverlay.remove();
          }
        }

        if (!el.querySelector('.oven-container-header')) {
          const header = document.createElement('div');
          header.className = 'oven-container-header';
          header.textContent = block.label;
          el.insertBefore(header, el.firstChild);
        }
        if (!el.querySelector('.oven-children-slot')) {
          const slot = document.createElement('div');
          slot.className = `oven-children-slot oven-slot-${block.id}`;
          // Move existing child nodes into the slot
          while (el.childNodes.length > 1) {
            slot.appendChild(el.childNodes[1]);
          }
          el.appendChild(slot);
        }
        triggerTailwindRescan(el);
      },
      getChildrenContainer() {
        return this.el.querySelector('.oven-children-slot') || this.el;
      },
    },
  });
}

// ─── Leaf Component Registration ─────────────────────────────────
// Renders the actual React component to static HTML via renderToStaticMarkup

function registerLeaf(
  componentManager: any,
  block: BlockDefinition,
  traits: Array<Record<string, unknown>>,
  fallback: string,
): void {
  componentManager.addType(block.id, {
    isComponent: (el: HTMLElement) => el.getAttribute?.('data-oven-type') === block.id,

    model: {
      defaults: {
        tagName: 'div',
        droppable: false,
        attributes: {
          'data-oven-type': block.id,
          class: `oven-component oven-${block.category}`,
        },
        traits,
        ...(block.defaultProps || {}),
      },
      init() {
        this.on('change:attributes', () => {
          if (this.view?.onRender) {
            this.view.onRender({ el: this.view.el, model: this });
          }
        });
      },
    },

    view: {
      onRender({ el, model }: { el: HTMLElement; model: any }) {
        const entry = componentRegistry[block.id];
        if (!entry) {
          el.innerHTML = fallback;
          return;
        }

        const props = extractTraitProps(model);
        if (!props.className) {
          const classes = extractUserClasses(model);
          if (classes) props.className = classes;
        }
        try {
          el.innerHTML = renderToStaticMarkup(
            React.createElement(entry.component, props),
          );
        } catch {
          // Components using hooks/context fail here → graceful fallback
          el.innerHTML = fallback;
        }
        triggerTailwindRescan(el);
      },
    },
  });
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
