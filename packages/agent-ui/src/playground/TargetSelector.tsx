'use client';

import { useState, useEffect } from 'react';
import { cn } from '@oven/oven-ui';

// ─── Types ──────────────────────────────────────────────────

export type PlaygroundMode = 'agent' | 'workflow';

export interface PlaygroundTarget {
  mode: PlaygroundMode;
  id: number;
  slug: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface TargetSelectorProps {
  apiBaseUrl?: string;
  onSelect: (target: PlaygroundTarget) => void;
  currentTarget?: PlaygroundTarget | null;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function TargetSelector({ apiBaseUrl = '', onSelect, currentTarget, className }: TargetSelectorProps) {
  const [mode, setMode] = useState<PlaygroundMode>(currentTarget?.mode ?? 'agent');
  const [items, setItems] = useState<Array<{ id: number; name: string; slug: string; description?: string }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const endpoint = mode === 'agent'
      ? `${apiBaseUrl}/api/agents?range=[0,99]`
      : `${apiBaseUrl}/api/agent-workflows?range=[0,99]&filter=${JSON.stringify({ status: 'active' })}`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [mode, apiBaseUrl]);

  const filtered = search
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.slug.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Mode Toggle */}
      <div className={cn('flex gap-1 p-1 bg-gray-100 rounded-lg')}>
        <button
          type="button"
          onClick={() => setMode('agent')}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
            mode === 'agent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          🤖 Agents
        </button>
        <button
          type="button"
          onClick={() => setMode('workflow')}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors',
            mode === 'workflow' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
          )}
        >
          🔀 Workflows
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${mode === 'agent' ? 'agents' : 'workflows'}...`}
        className={cn('w-full px-3 py-2 text-sm border rounded-lg bg-white placeholder:text-gray-400')}
      />

      {/* List */}
      <div className={cn('flex flex-col gap-1 max-h-60 overflow-y-auto')}>
        {loading && <p className={cn('text-xs text-gray-400 text-center py-4')}>Loading...</p>}
        {!loading && filtered.length === 0 && (
          <p className={cn('text-xs text-gray-400 text-center py-4')}>
            No {mode === 'agent' ? 'agents' : 'workflows'} found
          </p>
        )}
        {filtered.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect({ mode, id: item.id, slug: item.slug, name: item.name, description: item.description })}
            className={cn(
              'flex flex-col text-left px-3 py-2 rounded-lg border transition-all',
              currentTarget?.id === item.id && currentTarget?.mode === mode
                ? 'border-blue-400 bg-blue-50'
                : 'border-transparent hover:bg-gray-50 hover:border-gray-200',
            )}
          >
            <span className={cn('text-sm font-medium')}>{item.name}</span>
            <span className={cn('text-xs text-gray-400 font-mono')}>{item.slug}</span>
            {item.description && (
              <span className={cn('text-xs text-gray-500 mt-0.5 line-clamp-1')}>{item.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
