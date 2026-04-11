'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@oven/oven-ui';

// ─── Layout Modes ───────────────────────────────────────────

export type LayoutMode = 'inline' | 'modal' | 'fullscreen' | 'embedded';

export interface LayoutManagerProps {
  mode?: LayoutMode;
  chatPanel: React.ReactNode;
  sidePanel?: React.ReactNode;
  defaultSplitPercent?: number;
  minSplitPercent?: number;
  maxSplitPercent?: number;
  persistKey?: string;
  onModeChange?: (mode: LayoutMode) => void;
  className?: string;
}

const STORAGE_PREFIX = 'oven_layout_';

export function LayoutManager({
  mode = 'inline',
  chatPanel,
  sidePanel,
  defaultSplitPercent = 60,
  minSplitPercent = 30,
  maxSplitPercent = 80,
  persistKey,
  onModeChange,
  className,
}: LayoutManagerProps) {
  const [splitPercent, setSplitPercent] = useState(() => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}${persistKey}`);
        if (saved) return Number(saved);
      } catch { /* ignore */ }
    }
    return defaultSplitPercent;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(false);

  // Persist split on change
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${persistKey}`, String(splitPercent));
      } catch { /* ignore */ }
    }
  }, [splitPercent, persistKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('oven-layout-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(percent, minSplitPercent), maxSplitPercent);
      setSplitPercent(clamped);
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minSplitPercent, maxSplitPercent]);

  // ─── Fullscreen Mode ────────────────────────────────────────
  if (mode === 'fullscreen') {
    return (
      <div className={cn('fixed inset-0 z-50 bg-[var(--oven-widget-background,#FFF)]', className)}>
        <div className={cn('h-full flex')}>
          <div className={cn('flex-1')}>{chatPanel}</div>
          {sidePanel && !isSideCollapsed && (
            <div className={cn('w-72 border-l border-[var(--oven-widget-border,#E0E0E0)]')}>
              {sidePanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Modal Mode ─────────────────────────────────────────────
  if (mode === 'modal') {
    return (
      <>
        <div className={cn('fixed inset-0 z-40 bg-black/30')} />
        <div
          className={cn(
            'fixed inset-4 z-50 rounded-xl shadow-2xl overflow-hidden',
            'bg-[var(--oven-widget-background,#FFF)] border border-[var(--oven-widget-border,#E0E0E0)]',
            className,
          )}
        >
          <div className={cn('h-full flex')}>
            <div className={cn('flex-1')}>{chatPanel}</div>
            {sidePanel && !isSideCollapsed && (
              <div className={cn('w-72 border-l border-[var(--oven-widget-border,#E0E0E0)]')}>
                {sidePanel}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Inline / Embedded Mode (with resize) ───────────────────
  return (
    <div
      id="oven-layout-container"
      className={cn(
        'flex h-full overflow-hidden',
        'border border-[var(--oven-widget-border,#E0E0E0)] rounded-lg',
        mode === 'embedded' && 'rounded-none border-0',
        className,
      )}
    >
      {/* Chat panel */}
      <div
        className={cn('flex flex-col overflow-hidden')}
        style={{ '--panel-width': `${sidePanel && !isSideCollapsed ? splitPercent : 100}%` } as React.CSSProperties}
      >
        <div className={cn('h-full w-full')} style={{ width: 'var(--panel-width)' } as React.CSSProperties}>
          {chatPanel}
        </div>
      </div>

      {/* Resize handle */}
      {sidePanel && !isSideCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'w-1 cursor-col-resize hover:bg-blue-300 active:bg-blue-400 transition-colors flex-shrink-0',
            isDragging && 'bg-blue-400',
            !isDragging && 'bg-[var(--oven-widget-border,#E0E0E0)]',
          )}
        />
      )}

      {/* Side panel */}
      {sidePanel && !isSideCollapsed && (
        <div className={cn('flex-1 overflow-hidden min-w-0')}>
          {sidePanel}
        </div>
      )}

      {/* Collapse toggle */}
      {sidePanel && (
        <button
          type="button"
          onClick={() => setIsSideCollapsed(!isSideCollapsed)}
          className={cn(
            'absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-gray-200 text-gray-600',
            'flex items-center justify-center text-xs hover:bg-gray-300',
          )}
          aria-label={isSideCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isSideCollapsed ? '◀' : '▶'}
        </button>
      )}
    </div>
  );
}
