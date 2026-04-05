import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '../hooks/useCommandPalette';
import type { PaletteCommand } from '../types';

const commands: PaletteCommand[] = [
  { slug: 'help', name: 'Help', description: 'Show help', category: 'general' },
  { slug: 'clear', name: 'Clear', description: 'Clear chat', category: 'general' },
  { slug: 'search', name: 'Search', description: 'Search KB', category: 'knowledge' },
];

describe('useCommandPalette', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    expect(result.current.paletteState.isOpen).toBe(false);
  });

  it('opens on / prefix input', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    act(() => result.current.handleInputChange('/'));
    expect(result.current.paletteState.isOpen).toBe(true);
    expect(result.current.paletteState.filteredCommands).toHaveLength(3);
  });

  it('filters commands by input', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    act(() => result.current.handleInputChange('/hel'));
    expect(result.current.paletteState.filteredCommands).toHaveLength(1);
    expect(result.current.paletteState.filteredCommands[0].slug).toBe('help');
  });

  it('closes when input loses / prefix', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    act(() => result.current.handleInputChange('/'));
    expect(result.current.paletteState.isOpen).toBe(true);
    act(() => result.current.handleInputChange('hello'));
    expect(result.current.paletteState.isOpen).toBe(false);
  });

  it('selectCommand returns formatted command text', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    let text: string;
    act(() => { text = result.current.selectCommand('help'); });
    expect(text!).toBe('/help');
    expect(result.current.paletteState.isOpen).toBe(false);
  });

  it('closePalette resets state', () => {
    const { result } = renderHook(() => useCommandPalette(commands));
    act(() => result.current.handleInputChange('/'));
    expect(result.current.paletteState.isOpen).toBe(true);
    act(() => result.current.closePalette());
    expect(result.current.paletteState.isOpen).toBe(false);
  });
});
