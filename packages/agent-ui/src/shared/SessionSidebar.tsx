'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@oven/oven-ui';
import { ChatErrorCard } from './ChatErrorCard';
import { ConfirmDialog } from './ConfirmDialog';
import { PinIcon, EditIcon, DownloadIcon, TrashIcon, SearchIcon } from './icons';
import type { SessionSidebarProps, SessionExportFormat } from '../types';

// ─── SessionSidebar ────────────────────────────────────────
// Full session management UI: pinned/recent split, client-side search,
// per-row actions (pin / rename / export / delete), inline rename,
// ConfirmDialog for delete, per-row ChatErrorCard for mutation errors.
//
// Presentational: all mutations are delegated to parent callbacks which
// typically come from useSessionManager. The sidebar only owns local UI
// state (search input, rename editing, which export menu is open, which
// delete dialog is open).

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onPinSession,
  onRenameSession,
  onDeleteSession,
  onExportSession,
  rowErrors,
  onClearRowError,
  className,
}: SessionSidebarProps) {
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.title ?? `Chat #${s.id}`).toLowerCase().includes(q));
  }, [sessions, query]);

  const pinned = filtered.filter((s) => s.isPinned);
  const unpinned = filtered.filter((s) => !s.isPinned);

  const targetSession = deleteTarget !== null ? sessions.find((s) => s.id === deleteTarget) : null;

  return (
    <div className={cn('flex flex-col h-full border-r border-gray-200 bg-gray-50', className)}>
      {/* New chat button */}
      <div className={cn('p-3 border-b border-gray-200')}>
        <button
          type="button"
          onClick={onNewSession}
          className={cn(
            'w-full py-2 px-3 rounded-lg text-sm font-medium text-white',
            'bg-[var(--oven-widget-primary,#1976D2)] hover:opacity-90 transition-opacity',
          )}
        >
          + New Chat
        </button>
      </div>

      {/* Search */}
      <div className={cn('p-2 border-b border-gray-200 bg-white')}>
        <label className={cn('relative flex items-center')}>
          <span className={cn('absolute left-2 text-gray-400 pointer-events-none')}>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions"
            aria-label="Search sessions"
            className={cn(
              'w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-gray-200',
              'bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400',
            )}
          />
        </label>
      </div>

      {/* List */}
      <div className={cn('flex-1 overflow-y-auto')}>
        {pinned.length > 0 && (
          <div className={cn('px-2 pt-3 pb-1')}>
            <p className={cn('text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1')}>
              Pinned
            </p>
            {pinned.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                rowError={rowErrors?.[session.id]}
                onSelect={onSelectSession}
                onPin={onPinSession}
                onRename={onRenameSession}
                onRequestDelete={setDeleteTarget}
                onExport={onExportSession}
                onClearRowError={onClearRowError}
              />
            ))}
          </div>
        )}

        <div className={cn('px-2 pt-3 pb-1')}>
          {pinned.length > 0 && (
            <p className={cn('text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1')}>
              Recent
            </p>
          )}
          {unpinned.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              rowError={rowErrors?.[session.id]}
              onSelect={onSelectSession}
              onPin={onPinSession}
              onRename={onRenameSession}
              onRequestDelete={setDeleteTarget}
              onExport={onExportSession}
              onClearRowError={onClearRowError}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className={cn('text-xs text-gray-400 text-center py-8')}>
            {query ? 'No matches' : 'No sessions yet'}
          </p>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete session?"
        message={
          targetSession
            ? `This will delete "${targetSession.title ?? `Chat #${targetSession.id}`}". This cannot be undone.`
            : 'This will delete the session. This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget !== null && onDeleteSession) onDeleteSession(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Session row ───────────────────────────────────────────

interface SessionItemProps {
  session: SessionSidebarProps['sessions'][number];
  isActive: boolean;
  rowError?: string;
  onSelect: (id: number) => void;
  onPin?: (id: number, pinned: boolean) => void;
  onRename?: (id: number, title: string) => void;
  onRequestDelete: (id: number) => void;
  onExport?: (id: number, format: SessionExportFormat) => void;
  onClearRowError?: (id: number) => void;
}

function SessionItem({
  session,
  isActive,
  rowError,
  onSelect,
  onPin,
  onRename,
  onRequestDelete,
  onExport,
  onClearRowError,
}: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title ?? `Chat #${session.id}`);
  const [exportOpen, setExportOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(session.title ?? `Chat #${session.id}`);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, session.title, session.id]);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== (session.title ?? `Chat #${session.id}`) && onRename) {
      onRename(session.id, trimmed);
    }
    setEditing(false);
  };

  const cancelRename = () => {
    setDraft(session.title ?? `Chat #${session.id}`);
    setEditing(false);
  };

  return (
    <div className={cn('mb-0.5 group')}>
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm',
          'hover:bg-gray-100 transition-colors',
          isActive && 'bg-white shadow-sm border-l-2 border-l-[var(--oven-widget-primary,#1976D2)]',
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
              }
            }}
            onBlur={commitRename}
            aria-label="Session title"
            className={cn(
              'flex-1 px-1 py-0.5 text-sm border border-blue-300 rounded',
              'focus:outline-none focus:ring-1 focus:ring-blue-500',
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(session.id)}
            className={cn('flex-1 min-w-0 text-left')}
          >
            <p className={cn('text-sm font-medium truncate')}>
              {session.title ?? `Chat #${session.id}`}
            </p>
            <p className={cn('text-xs text-gray-400')}>
              {session.updatedAt.toLocaleDateString()}
            </p>
          </button>
        )}

        {/* Actions visible on hover / focus */}
        {!editing && (
          <div
            className={cn(
              'flex items-center gap-0.5 shrink-0 ml-1',
              'opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
            )}
          >
            {onPin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(session.id, !session.isPinned);
                }}
                aria-label={session.isPinned ? 'Unpin session' : 'Pin session'}
                title={session.isPinned ? 'Unpin' : 'Pin'}
                className={cn(
                  'p-1 rounded hover:bg-gray-200',
                  session.isPinned ? 'text-blue-500' : 'text-gray-400',
                )}
              >
                <PinIcon />
              </button>
            )}
            {onRename && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                aria-label="Rename session"
                title="Rename"
                className={cn('p-1 rounded hover:bg-gray-200 text-gray-400')}
              >
                <EditIcon />
              </button>
            )}
            {onExport && (
              <div ref={exportMenuRef} className={cn('relative')}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen((v) => !v);
                  }}
                  aria-label="Export session"
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  title="Export"
                  className={cn('p-1 rounded hover:bg-gray-200 text-gray-400')}
                >
                  <DownloadIcon />
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className={cn(
                      'absolute right-0 top-full mt-1 z-10 bg-white',
                      'border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]',
                    )}
                  >
                    {(['json', 'markdown', 'plaintext'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExport(session.id, fmt);
                          setExportOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 capitalize',
                        )}
                      >
                        {fmt === 'plaintext' ? 'Plain text' : fmt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(session.id);
              }}
              aria-label="Delete session"
              title="Delete"
              className={cn('p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500')}
            >
              <TrashIcon />
            </button>
          </div>
        )}

        {session.messageCount !== undefined && session.messageCount > 0 && !editing && (
          <span className={cn('ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full')}>
            {session.messageCount}
          </span>
        )}
      </div>

      {rowError && (
        <div className={cn('px-2 pt-1')}>
          <ChatErrorCard
            error={rowError}
            category="network"
            onRetry={onClearRowError ? () => onClearRowError(session.id) : undefined}
          />
        </div>
      )}
    </div>
  );
}

