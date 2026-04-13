import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangeFilter } from '../../filters/DateRangeFilter';

describe('DateRangeFilter', () => {
  it('renders from and to date inputs', () => {
    render(
      <DateRangeFilter
        source="createdAt"
        label="Created"
        value={null}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Created from')).toBeInTheDocument();
    expect(screen.getByLabelText('Created to')).toBeInTheDocument();
  });

  it('displays existing range values', () => {
    render(
      <DateRangeFilter
        source="createdAt"
        label="Created"
        value={{ gte: '2026-01-01', lte: '2026-06-30' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Created from')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Created to')).toHaveValue('2026-06-30');
  });

  it('calls onChange with gte when from date is set', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangeFilter
        source="createdAt"
        label="Created"
        value={null}
        onChange={onChange}
      />,
    );

    const fromInput = screen.getByLabelText('Created from');
    await user.type(fromInput, '2026-03-15');
    expect(onChange).toHaveBeenLastCalledWith('createdAt', {
      gte: '2026-03-15',
      lte: undefined,
    });
  });

  it('calls onChange with null when both fields are cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangeFilter
        source="createdAt"
        label="Created"
        value={{ gte: '2026-01-01' }}
        onChange={onChange}
      />,
    );

    const fromInput = screen.getByLabelText('Created from');
    await user.clear(fromInput);
    expect(onChange).toHaveBeenLastCalledWith('createdAt', null);
  });
});
