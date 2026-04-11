import { describe, it, expect, beforeEach } from 'vitest';
import { themePresets, applyTheme, applyThemeWithOverrides, getResolvedTheme, clearTheme } from '../themes';
import type { ThemePresetName, ThemeVariables } from '../themes';

describe('Theming System', () => {
  beforeEach(() => {
    // Reset CSS custom properties between tests
    clearTheme();
  });

  describe('themePresets', () => {
    it('defines 10 theme presets', () => {
      expect(Object.keys(themePresets)).toHaveLength(10);
    });

    it('each preset has all required CSS variables', () => {
      const requiredVars: (keyof ThemeVariables)[] = [
        '--oven-widget-primary',
        '--oven-widget-primary-contrast',
        '--oven-widget-surface',
        '--oven-widget-background',
        '--oven-widget-text',
        '--oven-widget-text-secondary',
        '--oven-widget-border',
        '--oven-widget-border-radius',
        '--oven-widget-font-family',
        '--oven-widget-bubble-user',
        '--oven-widget-bubble-assistant',
        '--oven-widget-max-width',
        '--oven-widget-max-height',
      ];
      for (const preset of Object.values(themePresets)) {
        for (const varName of requiredVars) {
          expect(preset[varName]).toBeDefined();
          expect(preset[varName]).not.toBe('');
        }
      }
    });

    it('light preset has expected primary color', () => {
      expect(themePresets.light['--oven-widget-primary']).toBe('#1976D2');
    });

    it('dark preset has dark background', () => {
      expect(themePresets.dark['--oven-widget-background']).toBe('#1A1A1A');
    });
  });

  describe('applyTheme()', () => {
    it('applies preset by name', () => {
      applyTheme('ocean');
      const primary = document.documentElement.style.getPropertyValue('--oven-widget-primary');
      expect(primary).toBe('#0288D1');
    });

    it('applies partial overrides', () => {
      applyTheme({ '--oven-widget-primary': '#FF0000' });
      const primary = document.documentElement.style.getPropertyValue('--oven-widget-primary');
      expect(primary).toBe('#FF0000');
    });
  });

  describe('applyThemeWithOverrides()', () => {
    it('merges preset with overrides', () => {
      applyThemeWithOverrides('light', { '--oven-widget-primary': '#FF5722' });
      const primary = document.documentElement.style.getPropertyValue('--oven-widget-primary');
      expect(primary).toBe('#FF5722');
      // Background should still be light preset default
      const bg = document.documentElement.style.getPropertyValue('--oven-widget-background');
      expect(bg).toBe('#FFFFFF');
    });
  });

  describe('getResolvedTheme()', () => {
    it('returns full theme variables for preset', () => {
      const resolved = getResolvedTheme('forest');
      expect(resolved['--oven-widget-primary']).toBe('#2E7D32');
      expect(Object.keys(resolved)).toHaveLength(13);
    });

    it('returns merged theme with overrides', () => {
      const resolved = getResolvedTheme('light', { '--oven-widget-primary': '#000' });
      expect(resolved['--oven-widget-primary']).toBe('#000');
      expect(resolved['--oven-widget-background']).toBe('#FFFFFF');
    });
  });

  describe('clearTheme()', () => {
    it('removes all CSS custom properties', () => {
      applyTheme('dark');
      expect(document.documentElement.style.getPropertyValue('--oven-widget-primary')).not.toBe('');
      clearTheme();
      expect(document.documentElement.style.getPropertyValue('--oven-widget-primary')).toBe('');
    });
  });
});
