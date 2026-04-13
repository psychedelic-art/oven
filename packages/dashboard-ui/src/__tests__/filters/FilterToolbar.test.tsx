import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterToolbar } from '../../filters/FilterToolbar';
import type { FilterDefinition, FilterValue } from '../../filters/types';

const testFilters: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  {
    source: 'status',
    label: 'Status',
    kind: 'status',
    choices: [
      { id: 'active', name: 'Active', colour: 'success' },
      { id: 'closed', name: 'Closed', colour: 'error' },
    ],
  },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

describe('FilterToolbar', () => {
  it('renders always-on search filter', () => {
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{}}
        setFilters={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('renders Filters button for non-alwaysOn filters', () => {
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{}}
        setFilters={vi.fn()}
      />,
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('opens popover menu when Filters button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{}}
        setFilters={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Filters'));
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows active-filter chips for non-empty values', () => {
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{ status: 'active' }}
        setFilters={vi.fn()}
      />,
    );
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
  });

  it('shows Clear all button when filters are active', () => {
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{ status: 'active' }}
        setFilters={vi.fn()}
      />,
    );
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('removes a single filter chip when deleted', async () => {
    const user = userEvent.setup();
    const setFilters = vi.fn();
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{ status: 'active', enabled: true }}
        setFilters={setFilters}
      />,
    );

    // Find the chip for "Status: Active" and click its delete button
    const statusChip = screen.getByText('Status: Active').closest('.MuiChip-root');
    const deleteButton = statusChip?.querySelector('.MuiChip-deleteIcon');
    if (deleteButton) {
      await user.click(deleteButton);
    }
    expect(setFilters).toHaveBeenCalledWith({ enabled: true });
  });

  it('clears all filters except tenantId when Clear all is clicked', async () => {
    const user = userEvent.setup();
    const setFilters = vi.fn();
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{ status: 'active', enabled: true, tenantId: 5 } as Record<string, FilterValue>}
        setFilters={setFilters}
      />,
    );

    await user.click(screen.getByText('Clear all'));
    expect(setFilters).toHaveBeenCalledWith({ tenantId: 5 });
  });

  it('does not show chips for quick-search or tenantId values', () => {
    render(
      <FilterToolbar
        filters={testFilters}
        filterValues={{ q: 'hello', tenantId: 3 } as Record<string, FilterValue>}
        setFilters={vi.fn()}
      />,
    );
    // No chip row should appear
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });
});
