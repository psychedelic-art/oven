'use client';

import { useState, useRef, useCallback } from 'react';

interface TooltipProps {
  text: string;
  shortcut?: string;
  children: React.ReactNode;
}

/**
 * Lightweight inline-styled tooltip. No MUI dependency.
 * Shows on hover below the trigger element with an optional keyboard shortcut badge.
 */
export function Tooltip({ text, shortcut, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 400); // slight delay
  }, []);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            padding: '6px 10px',
            background: '#1a1a2e',
            border: '1px solid #444',
            borderRadius: 6,
            color: '#ddd',
            fontSize: 11,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{text}</span>
          {shortcut && (
            <span
              style={{
                padding: '1px 5px',
                background: '#333',
                borderRadius: 3,
                fontSize: 10,
                color: '#aaa',
                border: '1px solid #555',
                fontFamily: 'monospace',
              }}
            >
              {shortcut}
            </span>
          )}
          {/* Arrow pointer */}
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#1a1a2e',
              borderLeft: '1px solid #444',
              borderTop: '1px solid #444',
            }}
          />
        </div>
      )}
    </div>
  );
}
