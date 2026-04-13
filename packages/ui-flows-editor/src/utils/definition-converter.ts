import type { Node, Edge } from '@xyflow/react';
import type {
  UiFlowDefinition,
  UiFlowPageDefinition,
  NavigationConfig,
  PortalSettings,
} from '@oven/module-ui-flows/types';
import { normalizePageSlug } from '@oven/module-ui-flows/slug-utils';

/** Convert a UiFlowDefinition's pages to ReactFlow nodes and edges. */
export function definitionToNodes(
  definition?: UiFlowDefinition,
): { nodes: Node[]; edges: Edge[] } {
  if (!definition?.pages?.length) {
    return {
      nodes: [
        {
          id: 'home',
          type: 'home',
          position: { x: 300, y: 50 },
          data: { title: 'Home', slug: 'home' },
        },
      ],
      edges: [],
    };
  }

  const nodes: Node[] = definition.pages.map((page, index) => ({
    id: page.id,
    type:
      page.type === 'landing' ||
      page.type === 'form' ||
      page.type === 'faq' ||
      page.type === 'chat' ||
      page.type === 'custom'
        ? page.type
        : 'landing',
    position: page.position ?? { x: 300, y: 50 + index * 150 },
    data: {
      title: page.title,
      slug: page.slug,
      formRef: page.formRef,
      ...page.config,
    },
  }));

  const edges: Edge[] = [];
  if (definition.navigation?.items) {
    for (let i = 0; i < definition.navigation.items.length - 1; i++) {
      const from = definition.navigation.items[i];
      const to = definition.navigation.items[i + 1];
      edges.push({
        id: `nav-${from.pageId}-${to.pageId}`,
        source: from.pageId,
        target: to.pageId,
        sourceHandle: 'output',
        targetHandle: 'input',
      });
    }
  }

  return { nodes, edges };
}

function extractConfig(node: Node): Record<string, unknown> {
  const data = node.data as Record<string, unknown> | undefined;
  const config: Record<string, unknown> = {};
  const standardKeys = ['title', 'slug', 'formRef', 'label'];
  for (const [key, value] of Object.entries(data ?? {})) {
    if (!standardKeys.includes(key) && value !== undefined && value !== '') {
      config[key] = value;
    }
  }
  return Object.keys(config).length > 0 ? config : {};
}

/** Convert ReactFlow nodes back to a UiFlowDefinition. */
export function nodesToDefinition(
  nodes: Node[],
  edges: Edge[],
  navigation: NavigationConfig,
  settings: PortalSettings,
): UiFlowDefinition {
  const pages: UiFlowPageDefinition[] = nodes.map((node) => ({
    id: node.id,
    slug: normalizePageSlug(
      ((node.data as Record<string, unknown>)?.slug as string) ?? node.id,
    ),
    title:
      ((node.data as Record<string, unknown>)?.title as string) || '',
    type: (node.type as UiFlowPageDefinition['type']) || 'landing',
    formRef: (node.data as Record<string, unknown>)?.formRef as
      | string
      | undefined,
    config: extractConfig(node),
    position: node.position,
  }));

  return { pages, navigation, settings };
}
