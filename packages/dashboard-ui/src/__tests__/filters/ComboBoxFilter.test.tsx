import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComboBoxFilter } from '../../filters/ComboBoxFilter';

const choices = [
  { id: 'text', name: 'Text' },
  { id: 'embedding', name: 'Embedding' },
  { id: 'image', name: 'Image' },
];

describe('ComboBoxFilter', () => {
  it('renders with the given label', () => {
    render(
      <ComboBoxFilter
        source="type"
        label="Type"
        value={null}
        choices={choices}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
  });

  it('displays the selected choice name', () => {
    render(
      <ComboBoxFilter
        source="type"
        label="Type"
        value="embedding"
        choices={choices}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Embedding')).toBeInTheDocument();
  });

  it('calls onChange with the selected choice id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ComboBoxFilter
        source="type"
        label="Type"
        value={null}
        choices={choices}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Type');
    await user.click(input);
    await user.click(screen.getByText('Image'));
    expect(onChange).toHaveBeenCalledWith('type', 'image');
  });

  it('calls onChange with null when cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ComboBoxFilter
        source="type"
        label="Type"
        value="text"
        choices={choices}
        onChange={onChange}
      />,
    );

    const clearButton = screen.getByTitle('Clear');
    await user.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('type', null);
  });
});
