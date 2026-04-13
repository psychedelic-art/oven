import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UiFlowEditorProvider } from '../store/UiFlowEditorProvider';
import { PublishButton } from '../toolbar/PublishButton';
import type { PersistenceAdapter } from '../store/types';

function mockAdapter(overrides?: Partial<PersistenceAdapter>): PersistenceAdapter {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({
      definition: { pages: [], navigation: { type: 'sidebar', items: [] }, settings: {} },
      theme: { primaryColor: '#000' },
    }),
    publish: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderWithProvider(
  adapter: PersistenceAdapter,
  props?: { maxPages?: number },
) {
  return render(
    <UiFlowEditorProvider
      flowId={1}
      flowSlug="test"
      flowName="Test Flow"
      adapter={adapter}
      initialDefinition={{
        pages: [
          { id: 'home', slug: '', title: 'Home', type: 'landing', position: { x: 0, y: 0 } },
        ],
        navigation: { type: 'sidebar', items: [] },
        settings: {},
      }}
    >
      <PublishButton {...props} />
    </UiFlowEditorProvider>,
  );
}

describe('PublishButton', () => {
  it('renders a Publish button', () => {
    renderWithProvider(mockAdapter());
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('shows confirmation dialog for a valid definition', async () => {
    const user = userEvent.setup();
    renderWithProvider(mockAdapter());
    await user.click(screen.getByRole('button', { name: /publish/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
  });

  it('shows validation errors when definition is invalid (maxPages exceeded)', async () => {
    const user = userEvent.setup();
    renderWithProvider(mockAdapter(), { maxPages: 0 });
    await user.click(screen.getByRole('button', { name: /publish/i }));
    expect(screen.getByText(/cannot publish/i)).toBeInTheDocument();
    expect(screen.getByText(/too many pages/i)).toBeInTheDocument();
    // No publish button in the dialog
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
  });

  it('calls publish on confirmation for a valid definition', async () => {
    const adapter = mockAdapter();
    const user = userEvent.setup();
    renderWithProvider(adapter);
    await user.click(screen.getByRole('button', { name: /publish/i }));
    await user.click(screen.getByRole('button', { name: /^publish$/i }));
    expect(adapter.publish).toHaveBeenCalledOnce();
  });
});
