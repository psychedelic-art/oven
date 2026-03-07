'use client';

import React from 'react';
import type { ComponentNode, FormContext } from '../types';
import { useFormContext, resolveBindings } from '../hooks/useFormContext';
import { useDataSource } from '../hooks/useDataSource';
import { componentRegistry } from '../registry';

// ─── ComponentRenderer ──────────────────────────────────────────
// Recursive factory renderer: maps JSON component tree → React components.
// Resolves $.path bindings, data sources, and renders children recursively.

interface ComponentRendererProps {
  /** Component node from the JSON tree */
  node: ComponentNode;
}

export function ComponentRenderer({ node }: ComponentRendererProps) {
  const context = useFormContext();

  const entry = componentRegistry[node.type];
  if (!entry) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="border border-dashed border-red-300 bg-red-50 p-2 rounded text-sm text-red-600">
          Unknown component: <code>{node.type}</code>
        </div>
      );
    }
    return null;
  }

  const Component = entry.component;

  // Resolve $.path bindings from form context
  const resolvedProps = resolveBindings(node.props, node.bindings, context);

  // If component has data source, render with data fetching
  if (node.dataSource) {
    return (
      <DataSourceRenderer node={node} resolvedProps={resolvedProps}>
        {node.children?.map((child) => (
          <ComponentRenderer key={child.id} node={child} />
        ))}
      </DataSourceRenderer>
    );
  }

  // Wire onChange for input components to update form context
  const enhancedProps = enhanceWithFormBindings(node, resolvedProps, context);

  return (
    <Component {...enhancedProps}>
      {node.children?.map((child) => (
        <ComponentRenderer key={child.id} node={child} />
      ))}
    </Component>
  );
}

// ─── DataSourceRenderer ─────────────────────────────────────────
// Wraps a component with data fetching via useDataSource hook.

function DataSourceRenderer({
  node,
  resolvedProps,
  children,
}: {
  node: ComponentNode;
  resolvedProps: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  const context = useFormContext();
  const entry = componentRegistry[node.type];
  if (!entry) return null;

  const Component = entry.component;

  const { data, loading, error, page, totalCount, hasMore, setPage, loadMore, refetch } =
    useDataSource({
      config: node.dataSource!,
      context,
      autoFetch: true,
    });

  // Store data source result in form context for downstream components
  React.useEffect(() => {
    if (data && node.dataSource) {
      context.setDataSourceResult(node.id, data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const dataProps = {
    ...resolvedProps,
    data: data ?? [],
    loading,
    error,
    currentPage: page,
    totalCount,
    hasMore,
    onPageChange: setPage,
    onLoadMore: loadMore,
    onRefetch: refetch,
  };

  return <Component {...dataProps}>{children}</Component>;
}

// ─── enhanceWithFormBindings ─────────────────────────────────────
// Automatically wires onChange handlers for input components
// to update the form context.

function enhanceWithFormBindings(
  node: ComponentNode,
  props: Record<string, unknown>,
  context: FormContext,
): Record<string, unknown> {
  const enhanced = { ...props };

  // If the component has a 'name' prop, wire it to form context
  const fieldName = (props.name as string) || node.id;

  // Set value from form context if not explicitly provided
  if (!('value' in enhanced) && fieldName) {
    enhanced.value = context.formFields[fieldName];
  }
  if (!('checked' in enhanced) && fieldName && node.type === 'oven-checkbox') {
    enhanced.checked = context.formFields[fieldName] as boolean;
  }

  // Wire onChange to update form context
  if (!enhanced.onChange) {
    enhanced.onChange = (value: unknown) => {
      context.setFieldValue(fieldName, value);
    };
  }

  return enhanced;
}

// ─── renderComponentTree ─────────────────────────────────────────
// Convenience function to render an array of ComponentNodes.

export function renderComponentTree(nodes: ComponentNode[]) {
  return nodes.map((node) => <ComponentRenderer key={node.id} node={node} />);
}

export default ComponentRenderer;
