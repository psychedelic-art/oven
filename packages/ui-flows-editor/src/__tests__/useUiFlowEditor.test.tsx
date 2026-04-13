import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UiFlowEditorProvider, useUiFlowEditorStore } from '../store/UiFlowEditorProvider';
import type { PersistenceAdapter } from '../store/types';

function mockAdapter(): PersistenceAdapter {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({
      definition: { pages: [], navigation: { type: 'sidebar', items: [] }, settings: {} },
      theme: { primaryColor: '#000' },
    }),
    publish: vi.fn().mockResolvedValue(undefined),
  };
}

function FlowIdDisplay({ testId }: { testId: string }) {
  const flowId = useUiFlowEditorStore((s) => s.flowId);
  return <div data-testid={testId}>{flowId}</div>;
}

function FlowNameDisplay({ testId }: { testId: string }) {
  const flowName = useUiFlowEditorStore((s) => s.flowName);
  return <div data-testid={testId}>{flowName}</div>;
}

describe('UiFlowEditorProvider + useUiFlowEditorStore', () => {
  it('provides store values to children', () => {
    render(
      <UiFlowEditorProvider
        flowId={1}
        flowSlug="test"
        flowName="Test Flow"
        adapter={mockAdapter()}
      >
        <FlowNameDisplay testId="name" />
      </UiFlowEditorProvider>,
    );
    expect(screen.getByTestId('name')).toHaveTextContent('Test Flow');
  });

  it('throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FlowIdDisplay testId="fail" />)).toThrow(
      'useUiFlowEditorStore must be used within a <UiFlowEditorProvider>',
    );
    spy.mockRestore();
  });

  it('creates isolated stores for two sibling providers (no singleton)', () => {
    render(
      <>
        <UiFlowEditorProvider
          flowId={10}
          flowSlug="alpha"
          flowName="Alpha"
          adapter={mockAdapter()}
        >
          <FlowIdDisplay testId="a" />
        </UiFlowEditorProvider>
        <UiFlowEditorProvider
          flowId={20}
          flowSlug="beta"
          flowName="Beta"
          adapter={mockAdapter()}
        >
          <FlowIdDisplay testId="b" />
        </UiFlowEditorProvider>
      </>,
    );
    expect(screen.getByTestId('a')).toHaveTextContent('10');
    expect(screen.getByTestId('b')).toHaveTextContent('20');
  });

  it('creates store with initial definition nodes', () => {
    function NodeCount({ testId }: { testId: string }) {
      const nodes = useUiFlowEditorStore((s) => s.nodes);
      return <div data-testid={testId}>{nodes.length}</div>;
    }

    render(
      <UiFlowEditorProvider
        flowId={1}
        flowSlug="test"
        flowName="Test"
        adapter={mockAdapter()}
        initialDefinition={{
          pages: [
            { id: 'home', slug: '', title: 'Home', type: 'landing', position: { x: 0, y: 0 } },
            { id: 'faq', slug: 'faq', title: 'FAQ', type: 'faq', position: { x: 0, y: 150 } },
          ],
          navigation: { type: 'sidebar', items: [] },
          settings: {},
        }}
      >
        <NodeCount testId="count" />
      </UiFlowEditorProvider>,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });
});
