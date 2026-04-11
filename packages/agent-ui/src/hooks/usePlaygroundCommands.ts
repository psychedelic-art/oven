'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaletteCommand, UIMessage } from '../types';

// ─── Constants ──────────────────────────────────────────────

/**
 * Commands that are meaningful only in agent mode and should be blocked
 * (with a user-visible warning) when the playground is in workflow mode.
 * Lifted from the legacy MUI AIPlaygroundPage.
 */
export const WORKFLOW_BLOCKED_COMMANDS: ReadonlySet<string> = new Set([
  'agent',
  'tools',
  'skill',
  'mcp',
  'pin',
  'feedback',
  'search',
  'reset',
]);

const VALID_MODELS = ['fast', 'smart', 'claude'] as const;

// ─── Types ──────────────────────────────────────────────────

export interface PlaygroundRuntimeConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableTools: boolean;
  enableMemory: boolean;
}

export interface UsePlaygroundCommandsOptions {
  apiBaseUrl?: string;
  mode: 'agent' | 'workflow';
  runtimeConfig: PlaygroundRuntimeConfig;
  targetName?: string | null;
  onConfigChange: (partial: Partial<PlaygroundRuntimeConfig>) => void;
  onAppendSystemMessage: (text: string) => void;
  onClearMessages: () => void;
  exportMessages: () => UIMessage[];
}

export interface UsePlaygroundCommandsReturn {
  commands: PaletteCommand[];
  isLoading: boolean;
  error: Error | null;
  /** Returns true if the command was handled locally (caller must NOT forward to backend). */
  executeLocal: (slug: string, args: string) => boolean;
  /** True if the slug is blocked in the current mode. */
  isBlocked: (slug: string) => boolean;
  /** Parse a free-text input into a command tuple. Returns null if not a command. */
  parseCommand: (text: string) => { slug: string; args: string } | null;
}

// ─── Hook ───────────────────────────────────────────────────

export function usePlaygroundCommands(
  opts: UsePlaygroundCommandsOptions,
): UsePlaygroundCommandsReturn {
  const apiBaseUrl = opts.apiBaseUrl ?? '';
  const [commands, setCommands] = useState<PaletteCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep latest-state refs so callbacks stay stable even when props change.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  // Fetch commands on mount.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const url = `${apiBaseUrl}/api/chat-commands?range=[0,99]&filter=${encodeURIComponent(
      JSON.stringify({ enabled: true }),
    )}`;
    fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error(`Failed to load commands: ${r.status}`);
        return r.json() as Promise<unknown>;
      })
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          const mapped: PaletteCommand[] = data
            .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
            .map(c => ({
              slug: String(c.slug ?? ''),
              name: String(c.name ?? c.slug ?? ''),
              description: String(c.description ?? ''),
              category: String(c.category ?? 'general'),
            }))
            .filter(c => c.slug.length > 0);
          setCommands(mapped);
        } else {
          setCommands([]);
        }
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setCommands([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  const isBlocked = useCallback((slug: string): boolean => {
    return optsRef.current.mode === 'workflow' && WORKFLOW_BLOCKED_COMMANDS.has(slug);
  }, []);

  const parseCommand = useCallback((text: string): { slug: string; args: string } | null => {
    if (!text.startsWith('/') || text.length < 2) return null;
    const body = text.slice(1);
    const match = body.match(/^(\S+)(?:\s+([\s\S]*))?$/);
    if (!match) return null;
    return { slug: match[1], args: (match[2] ?? '').trim() };
  }, []);

  const executeLocal = useCallback((slug: string, args: string): boolean => {
    const {
      runtimeConfig,
      targetName,
      onConfigChange,
      onAppendSystemMessage,
      onClearMessages,
      exportMessages,
      mode,
    } = optsRef.current;

    switch (slug) {
      case 'clear': {
        onClearMessages();
        onAppendSystemMessage('🗑️ Chat cleared.');
        return true;
      }
      case 'help': {
        const list = commandsRef.current.length > 0
          ? commandsRef.current.map(c => `  /${c.slug} — ${c.description}`).join('\n')
          : '  (no commands available)';
        onAppendSystemMessage(`📋 Available commands:\n${list}`);
        return true;
      }
      case 'status': {
        const lines = [
          '📊 Status:',
          `  Mode: ${mode}`,
          `  Target: ${targetName ?? 'none'}`,
          `  Model: ${runtimeConfig.model}`,
          `  Temperature: ${runtimeConfig.temperature}`,
        ];
        onAppendSystemMessage(lines.join('\n'));
        return true;
      }
      case 'model': {
        const value = args.trim();
        if ((VALID_MODELS as readonly string[]).includes(value)) {
          onConfigChange({ model: value });
          onAppendSystemMessage(`✅ Model changed to: ${value}`);
        } else {
          onAppendSystemMessage(`❌ Invalid model. Use: ${VALID_MODELS.join(', ')}`);
        }
        return true;
      }
      case 'temperature': {
        const num = Number.parseFloat(args);
        if (!Number.isNaN(num) && num >= 0 && num <= 2) {
          onConfigChange({ temperature: num });
          onAppendSystemMessage(`✅ Temperature changed to: ${num}`);
        } else {
          onAppendSystemMessage('❌ Temperature must be a number between 0 and 2.');
        }
        return true;
      }
      case 'export': {
        const snapshot = exportMessages();
        try {
          if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `playground-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }
          onAppendSystemMessage(`📥 Exported ${snapshot.length} messages.`);
        } catch (err) {
          onAppendSystemMessage(`❌ Export failed: ${(err as Error).message}`);
        }
        return true;
      }
      default:
        return false;
    }
  }, []);

  return { commands, isLoading, error, executeLocal, isBlocked, parseCommand };
}
