'use client';

// ─── ConfirmDialog ──────────────────────────────────────────
// Lightweight modal primitive. Tailwind via cn(), no external deps.
// - role="dialog" + aria-modal="true"
// - Focuses the confirm button on open
// - Esc -> onCancel, Enter -> onConfirm
// - Backdrop click -> onCancel
// - destructive flag swaps confirm button to red variant

import { useEffect, useRef } from 'react';
import { cn } from '@oven/oven-ui';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Focus confirm button on open
  useEffect(() => {
    if (open) {
      // Defer to next tick so the element is in the DOM
      const t = setTimeout(() => confirmRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard handlers (Enter/Esc)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        // Only fire confirm if the focused element is NOT the cancel button
        const active = document.activeElement;
        if (active && active.getAttribute('data-role') === 'cancel') {
          return; // let the click handler fire via default Enter-on-button
        }
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/40 backdrop-blur-sm',
      )}
      onClick={(e) => {
        // Backdrop click cancels — only when clicking the backdrop, not the card
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={cn(
          'bg-white rounded-lg shadow-xl border border-gray-200',
          'w-full max-w-md mx-4 p-5',
        )}
      >
        <h2
          id="confirm-dialog-title"
          className={cn('text-base font-semibold text-gray-900 mb-1')}
        >
          {title}
        </h2>
        <p className={cn('text-sm text-gray-600 mb-5')}>{message}</p>

        <div className={cn('flex justify-end gap-2')}>
          <button
            type="button"
            data-role="cancel"
            onClick={onCancel}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md border border-gray-300',
              'text-gray-700 bg-white hover:bg-gray-50',
              'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400',
            )}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            data-role="confirm"
            onClick={onConfirm}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md text-white',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              destructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
