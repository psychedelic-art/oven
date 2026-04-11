'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@oven/oven-ui';
import { CommandPalette } from './CommandPalette';
import { useCommandPalette } from '../hooks/useCommandPalette';
import type { MessageInputProps } from '../types';

const MAX_ROWS = 6;
const COUNTER_THRESHOLD = 0.8;

export function MessageInput({
  onSend,
  disabled,
  placeholder = 'Type a message...',
  maxLength = 10000,
  commands = [],
  onCommandSelect,
  className,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { paletteState, handleInputChange, handleKeyDown, selectCommand, closePalette } = useCommandPalette(commands);

  const showCounter = value.length > maxLength * COUNTER_THRESHOLD;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.rows = 1;
      const lineHeight = parseInt(getComputedStyle(el).lineHeight || '20');
      const rows = Math.min(Math.ceil(el.scrollHeight / lineHeight), MAX_ROWS);
      el.rows = rows;
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length > maxLength) return;
    setValue(newValue);
    handleInputChange(newValue);
    adjustHeight();
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    closePalette();
    if (textareaRef.current) textareaRef.current.rows = 1;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Command palette keyboard navigation
    const result = handleKeyDown(e);
    if (result !== null) {
      setValue(result);
      if (onCommandSelect && result.startsWith('/')) {
        onCommandSelect(result.slice(1).trim());
      }
      return;
    }

    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn('relative', className)}>
      {paletteState.isOpen && (
        <CommandPalette
          commands={paletteState.filteredCommands}
          filter={paletteState.filter}
          selectedIndex={paletteState.selectedIndex}
          onSelect={(slug) => {
            const text = selectCommand(slug);
            setValue(text);
          }}
          onClose={closePalette}
        />
      )}

      <div className={cn('flex items-end gap-2 border rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-200')}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Message input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-colors',
            'bg-[var(--oven-widget-primary,#1976D2)]',
            (disabled || !value.trim()) && 'opacity-40 cursor-not-allowed',
            !(disabled || !value.trim()) && 'hover:opacity-90',
          )}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>

      {showCounter && (
        <p className={cn('text-xs text-gray-400 text-right mt-1')}>
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
