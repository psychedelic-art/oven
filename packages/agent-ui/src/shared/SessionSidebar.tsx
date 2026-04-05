'use client';

import { cn } from '@oven/oven-ui';
import type { SessionSidebarProps } from '../types';

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onPinSession,
  onDeleteSession,
  className,
}: SessionSidebarProps) {
  const pinned = sessions.filter(s => s.isPinned);
  const unpinned = sessions.filter(s => !s.isPinned);

  return (
    <div className={cn('flex flex-col h-full border-r border-gray-200 bg-gray-50', className)}>
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

      <div className={cn('flex-1 overflow-y-auto')}>
        {pinned.length > 0 && (
          <div className={cn('px-2 pt-3 pb-1')}>
            <p className={cn('text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1')}>Pinned</p>
            {pinned.map(session => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={onSelectSession}
                onPin={onPinSession}
                onDelete={onDeleteSession}
              />
            ))}
          </div>
        )}

        <div className={cn('px-2 pt-3 pb-1')}>
          {pinned.length > 0 && (
            <p className={cn('text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1')}>Recent</p>
          )}
          {unpinned.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={onSelectSession}
              onPin={onPinSession}
              onDelete={onDeleteSession}
            />
          ))}
        </div>

        {sessions.length === 0 && (
          <p className={cn('text-xs text-gray-400 text-center py-8')}>No sessions yet</p>
        )}
      </div>
    </div>
  );
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onPin,
  onDelete,
}: {
  session: SessionSidebarProps['sessions'][number];
  isActive: boolean;
  onSelect: (id: number) => void;
  onPin?: (id: number) => void;
  onDelete?: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(session.id)}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm mb-0.5',
        'hover:bg-gray-100 transition-colors',
        isActive && 'bg-white shadow-sm border-l-2 border-l-[var(--oven-widget-primary,#1976D2)]',
      )}
    >
      <div className={cn('flex-1 min-w-0')}>
        <p className={cn('text-sm font-medium truncate')}>
          {session.title ?? `Chat #${session.id}`}
        </p>
        <p className={cn('text-xs text-gray-400')}>
          {session.updatedAt.toLocaleDateString()}
        </p>
      </div>
      {session.messageCount !== undefined && session.messageCount > 0 && (
        <span className={cn('ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full')}>
          {session.messageCount}
        </span>
      )}
    </button>
  );
}
