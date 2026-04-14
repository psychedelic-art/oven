import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete session"
        message="Are you sure you want to delete this session?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Delete session')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this session?'),
    ).toBeInTheDocument();
  });

  it('uses default button labels', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses custom button labels', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        confirmLabel="Delete forever"
        cancelLabel="Keep it"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Delete forever' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('fires onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onCancel on Esc key', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fires onConfirm on Enter key', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses destructive (red) styling when destructive=true', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Confirm' });
    expect(btn.className).toContain('bg-red-600');
  });

  it('renders dialog with aria-modal and role="dialog"', () => {
    render(
      <ConfirmDialog
        open
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
