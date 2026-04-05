import { themePresets } from './presets';
import type { ThemeVariables, ThemePresetName } from './presets';

// ─── Apply Theme ────────────────────────────────────────────
// Sets CSS custom properties on a target element (default: document.documentElement).
// Accepts a preset name, a full ThemeVariables object, or a partial override.

export function applyTheme(
  theme: ThemePresetName | Partial<ThemeVariables>,
  target?: HTMLElement,
): void {
  const el = target ?? document.documentElement;
  const vars = typeof theme === 'string'
    ? themePresets[theme]
    : { ...themePresets.light, ...theme };

  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
}

// ─── Apply Theme with Tenant Overrides ──────────────────────
// Merges preset with tenant-specific config overrides.

export function applyThemeWithOverrides(
  preset: ThemePresetName,
  overrides?: Partial<ThemeVariables>,
  target?: HTMLElement,
): void {
  const el = target ?? document.documentElement;
  const base = themePresets[preset];
  const merged = { ...base, ...overrides };

  for (const [key, value] of Object.entries(merged)) {
    el.style.setProperty(key, value);
  }
}

// ─── Get Resolved Theme ─────────────────────────────────────
// Returns the full resolved theme variables for a preset + overrides.

export function getResolvedTheme(
  preset: ThemePresetName,
  overrides?: Partial<ThemeVariables>,
): ThemeVariables {
  return { ...themePresets[preset], ...overrides };
}

// ─── Clear Theme ────────────────────────────────────────────
// Removes all oven-widget CSS custom properties from the target.

export function clearTheme(target?: HTMLElement): void {
  const el = target ?? document.documentElement;
  const sampleKeys = Object.keys(themePresets.light);
  for (const key of sampleKeys) {
    el.style.removeProperty(key);
  }
}
