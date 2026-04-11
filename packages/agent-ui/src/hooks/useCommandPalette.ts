'use client';

import { useState, useCallback } from 'react';
import type { PaletteCommand, CommandPaletteState } from '../types';

export interface UseCommandPaletteReturn {
  paletteState: CommandPaletteState;
  handleInputChange: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => string | null;
  selectCommand: (slug: string) => string;
  closePalette: () => void;
}

export function useCommandPalette(commands: PaletteCommand[]): UseCommandPaletteReturn {
  const [paletteState, setPaletteState] = useState<CommandPaletteState>({
    isOpen: false,
    filter: '',
    filteredCommands: [],
    selectedIndex: 0,
  });

  const handleInputChange = useCallback((value: string) => {
    if (value.startsWith('/')) {
      const filter = value.slice(1).toLowerCase();
      const filtered = commands.filter(cmd =>
        cmd.slug.toLowerCase().includes(filter) ||
        cmd.name.toLowerCase().includes(filter) ||
        cmd.description.toLowerCase().includes(filter)
      );
      setPaletteState({
        isOpen: true,
        filter,
        filteredCommands: filtered,
        selectedIndex: 0,
      });
    } else {
      setPaletteState(prev => prev.isOpen ? { ...prev, isOpen: false, filter: '', filteredCommands: [], selectedIndex: 0 } : prev);
    }
  }, [commands]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): string | null => {
    if (!paletteState.isOpen) return null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setPaletteState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredCommands.length - 1),
        }));
        return null;
      case 'ArrowUp':
        e.preventDefault();
        setPaletteState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return null;
      case 'Enter':
        e.preventDefault();
        if (paletteState.filteredCommands[paletteState.selectedIndex]) {
          const slug = paletteState.filteredCommands[paletteState.selectedIndex].slug;
          setPaletteState({ isOpen: false, filter: '', filteredCommands: [], selectedIndex: 0 });
          return `/${slug}`;
        }
        return null;
      case 'Escape':
        e.preventDefault();
        setPaletteState({ isOpen: false, filter: '', filteredCommands: [], selectedIndex: 0 });
        return null;
      case 'Tab':
        e.preventDefault();
        if (paletteState.filteredCommands[paletteState.selectedIndex]) {
          return `/${paletteState.filteredCommands[paletteState.selectedIndex].slug} `;
        }
        return null;
      default:
        return null;
    }
  }, [paletteState]);

  const selectCommand = useCallback((slug: string): string => {
    setPaletteState({ isOpen: false, filter: '', filteredCommands: [], selectedIndex: 0 });
    return `/${slug}`;
  }, []);

  const closePalette = useCallback(() => {
    setPaletteState({ isOpen: false, filter: '', filteredCommands: [], selectedIndex: 0 });
  }, []);

  return { paletteState, handleInputChange, handleKeyDown, selectCommand, closePalette };
}
