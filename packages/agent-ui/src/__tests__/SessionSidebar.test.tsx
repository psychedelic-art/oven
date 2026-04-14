import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionSidebar } from '../shared/SessionSidebar';

const baseSessions = [
  { id: 1, title: 'Pinned Chat A', isPinned: true, updatedAt: new Date('2026-04-10'), messageCount: 5 },
  { id: 2, title: 'Recent Chat B', isPinned: false, updatedAt: new Date('2026-04-11'), messageCount: 0 },
  { id: 3, title: null, isPinned: false, updatedAt: new Date('2026-04-12') },
];

describe('SessionSidebar', () => {
  it('renders pinned and recent sections', () => {
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
      />,
    );
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Pinned Chat A')).toBeInTheDocument();
    expect(screen.getByText('Recent Chat B')).toBeInTheDocument();
    expect(screen.getByText('Chat #3')).toBeInTheDocument();
  });

  it('shows a search input that filters sessions by title', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Search sessions');
    await user.type(input, 'Pinned');
    expect(screen.getByText('Pinned Chat A')).toBeInTheDocument();
    expect(screen.queryByText('Recent Chat B')).not.toBeInTheDocument();
  });

  it('shows "No matches" when search has no results', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Search sessions');
    await user.type(input, 'zzz-no-match');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('calls onPinSession with toggled value when pin button clicked', async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onPinSession={onPin}
      />,
    );
    // The pinned session gets an "Unpin" button
    const btn = screen.getByLabelText('Unpin session');
    await user.click(btn);
    expect(onPin).toHaveBeenCalledWith(1, false);
  });

  it('calls onRenameSession after inline rename commit on Enter', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onRenameSession={onRename}
      />,
    );
    const editBtns = screen.getAllByLabelText('Rename session');
    await user.click(editBtns[0]);

    const input = screen.getByLabelText('Session title');
    // Clear and type new name
    await user.clear(input);
    await user.type(input, 'Renamed Title{Enter}');
    expect(onRename).toHaveBeenCalledWith(1, 'Renamed Title');
  });

  it('cancels rename on Esc without calling onRenameSession', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onRenameSession={onRename}
      />,
    );
    const editBtns = screen.getAllByLabelText('Rename session');
    await user.click(editBtns[0]);

    const input = screen.getByLabelText('Session title');
    await user.type(input, 'X');
    fireEvent.keyDown(input, { key: 'Escape' });
    // The textfield should no longer be present
    expect(screen.queryByDisplayValue('Pinned Chat AX')).not.toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('opens ConfirmDialog when delete button clicked; confirms call onDeleteSession', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={onDelete}
      />,
    );

    const deleteBtns = screen.getAllByLabelText('Delete session');
    await user.click(deleteBtns[0]);

    // Modal opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('does NOT call onDeleteSession when ConfirmDialog cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={onDelete}
      />,
    );

    const deleteBtns = screen.getAllByLabelText('Delete session');
    await user.click(deleteBtns[0]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('export menu shows 3 formats and triggers onExportSession with the chosen format', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onExportSession={onExport}
      />,
    );

    const exportBtns = screen.getAllByLabelText('Export session');
    await user.click(exportBtns[0]);

    // Menu items visible
    expect(screen.getByRole('menuitem', { name: 'json' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'markdown' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Plain text' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'json' }));
    expect(onExport).toHaveBeenCalledWith(1, 'json');
  });

  it('renders ChatErrorCard inline when rowErrors has an entry for the session', () => {
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        rowErrors={{ 2: 'Rename failed: 500' }}
      />,
    );
    expect(screen.getByText('Rename failed: 500')).toBeInTheDocument();
  });

  it('calls onNewSession when New Chat button clicked', async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={vi.fn()}
        onNewSession={onNew}
      />,
    );
    await user.click(screen.getByText('+ New Chat'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectSession when row is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SessionSidebar
        sessions={baseSessions}
        onSelectSession={onSelect}
        onNewSession={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Recent Chat B'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
