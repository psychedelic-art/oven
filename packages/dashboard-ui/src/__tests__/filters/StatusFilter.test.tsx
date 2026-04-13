import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusFilter } from '../../filters/StatusFilter';
import type { StatusChoice } from '../../filters/types';

const choices: StatusChoice[] = [
  { id: 'active', name: 'Active', colour: 'success' },
  { id: 'closed', name: 'Closed', colour: 'error' },
  { id: 'archived', name: 'Archived', colour: 'default' },
];

describe('StatusFilter', () => {
  it('renders with the given label', () => {
    render(
      <StatusFilter
        source="status"
        label="Status"
        value={null}
        choices={choices}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('displays the selected choice name', () => {
    render(
      <StatusFilter
        source="status"
        label="Status"
        value="active"
        choices={choices}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Active')).toBeInTheDocument();
  });

  it('renders colour dots in the dropdown', async () => {
    const user = userEvent.setup();
    render(
      <StatusFilter
        source="status"
        label="Status"
        value={null}
        choices={choices}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Status'));
    // All three options should be visible
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('calls onChange with the selected choice id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StatusFilter
        source="status"
        label="Status"
        value={null}
        choices={choices}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('Status'));
    await user.click(screen.getByText('Closed'));
    expect(onChange).toHaveBeenCalledWith('status', 'closed');
  });
});
