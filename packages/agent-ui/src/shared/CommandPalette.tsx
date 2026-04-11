'use client';

import { cn } from '@oven/oven-ui';
import type { CommandPaletteProps } from '../types';

export function CommandPalette({ commands, filter, selectedIndex, onSelect, onClose, className }: CommandPaletteProps) {
  if (commands.length === 0) return null;

  // Group by category
  const grouped = new Map<string, typeof commands>();
  for (const cmd of commands) {
    const group = grouped.get(cmd.category) ?? [];
    group.push(cmd);
    grouped.set(cmd.category, group);
  }

  let flatIndex = 0;

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 mb-1 w-full max-h-60 overflow-y-auto',
        'rounded-lg border border-gray-200 bg-white shadow-lg z-50',
        className,
      )}
      role="listbox"
    >
      {Array.from(grouped.entries()).map(([category, cmds]) => (
        <div key={category}>
          <div className={cn('px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50')}>
            {category}
          </div>
          {cmds.map(cmd => {
            const idx = flatIndex++;
            return (
              <button
                key={cmd.slug}
                type="button"
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => onSelect(cmd.slug)}
                className={cn(
                  'flex flex-col w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
                  idx === selectedIndex && 'bg-blue-50',
                )}
              >
                <span className={cn('font-mono text-xs font-medium')}>/{cmd.slug}</span>
                <span className={cn('text-xs text-gray-500')}>{cmd.description}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
