// ─── Theme Variable Contract ────────────────────────────────

export interface ThemeVariables {
  '--oven-widget-primary': string;
  '--oven-widget-primary-contrast': string;
  '--oven-widget-surface': string;
  '--oven-widget-background': string;
  '--oven-widget-text': string;
  '--oven-widget-text-secondary': string;
  '--oven-widget-border': string;
  '--oven-widget-border-radius': string;
  '--oven-widget-font-family': string;
  '--oven-widget-bubble-user': string;
  '--oven-widget-bubble-assistant': string;
  '--oven-widget-max-width': string;
  '--oven-widget-max-height': string;
}

export type ThemePresetName =
  | 'light'
  | 'dark'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'corporate'
  | 'minimal'
  | 'neon'
  | 'warm'
  | 'cool';

// ─── Preset Definitions ─────────────────────────────────────

export const themePresets: Record<ThemePresetName, ThemeVariables> = {
  light: {
    '--oven-widget-primary': '#1976D2',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#F5F5F5',
    '--oven-widget-background': '#FFFFFF',
    '--oven-widget-text': '#333333',
    '--oven-widget-text-secondary': '#666666',
    '--oven-widget-border': '#E0E0E0',
    '--oven-widget-border-radius': '12px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#1976D2',
    '--oven-widget-bubble-assistant': '#F5F5F5',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  dark: {
    '--oven-widget-primary': '#90CAF9',
    '--oven-widget-primary-contrast': '#1A1A1A',
    '--oven-widget-surface': '#2D2D2D',
    '--oven-widget-background': '#1A1A1A',
    '--oven-widget-text': '#E0E0E0',
    '--oven-widget-text-secondary': '#9E9E9E',
    '--oven-widget-border': '#424242',
    '--oven-widget-border-radius': '12px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#90CAF9',
    '--oven-widget-bubble-assistant': '#2D2D2D',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  ocean: {
    '--oven-widget-primary': '#0288D1',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#E1F5FE',
    '--oven-widget-background': '#FFFFFF',
    '--oven-widget-text': '#01579B',
    '--oven-widget-text-secondary': '#0277BD',
    '--oven-widget-border': '#B3E5FC',
    '--oven-widget-border-radius': '16px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#0288D1',
    '--oven-widget-bubble-assistant': '#E1F5FE',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  forest: {
    '--oven-widget-primary': '#2E7D32',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#E8F5E9',
    '--oven-widget-background': '#FAFAFA',
    '--oven-widget-text': '#1B5E20',
    '--oven-widget-text-secondary': '#4CAF50',
    '--oven-widget-border': '#C8E6C9',
    '--oven-widget-border-radius': '10px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#2E7D32',
    '--oven-widget-bubble-assistant': '#E8F5E9',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  sunset: {
    '--oven-widget-primary': '#E65100',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#FFF3E0',
    '--oven-widget-background': '#FFFDE7',
    '--oven-widget-text': '#BF360C',
    '--oven-widget-text-secondary': '#F57C00',
    '--oven-widget-border': '#FFE0B2',
    '--oven-widget-border-radius': '14px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#E65100',
    '--oven-widget-bubble-assistant': '#FFF3E0',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  corporate: {
    '--oven-widget-primary': '#37474F',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#ECEFF1',
    '--oven-widget-background': '#FFFFFF',
    '--oven-widget-text': '#263238',
    '--oven-widget-text-secondary': '#546E7A',
    '--oven-widget-border': '#CFD8DC',
    '--oven-widget-border-radius': '8px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#37474F',
    '--oven-widget-bubble-assistant': '#ECEFF1',
    '--oven-widget-max-width': '420px',
    '--oven-widget-max-height': '620px',
  },
  minimal: {
    '--oven-widget-primary': '#000000',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#FAFAFA',
    '--oven-widget-background': '#FFFFFF',
    '--oven-widget-text': '#212121',
    '--oven-widget-text-secondary': '#757575',
    '--oven-widget-border': '#EEEEEE',
    '--oven-widget-border-radius': '4px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#212121',
    '--oven-widget-bubble-assistant': '#FAFAFA',
    '--oven-widget-max-width': '380px',
    '--oven-widget-max-height': '580px',
  },
  neon: {
    '--oven-widget-primary': '#00E676',
    '--oven-widget-primary-contrast': '#121212',
    '--oven-widget-surface': '#1E1E1E',
    '--oven-widget-background': '#121212',
    '--oven-widget-text': '#E0E0E0',
    '--oven-widget-text-secondary': '#00E676',
    '--oven-widget-border': '#333333',
    '--oven-widget-border-radius': '8px',
    '--oven-widget-font-family': "'JetBrains Mono', monospace",
    '--oven-widget-bubble-user': '#00E676',
    '--oven-widget-bubble-assistant': '#1E1E1E',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  warm: {
    '--oven-widget-primary': '#8D6E63',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#EFEBE9',
    '--oven-widget-background': '#FFF8F0',
    '--oven-widget-text': '#4E342E',
    '--oven-widget-text-secondary': '#8D6E63',
    '--oven-widget-border': '#D7CCC8',
    '--oven-widget-border-radius': '14px',
    '--oven-widget-font-family': "'Georgia', serif",
    '--oven-widget-bubble-user': '#8D6E63',
    '--oven-widget-bubble-assistant': '#EFEBE9',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
  cool: {
    '--oven-widget-primary': '#5C6BC0',
    '--oven-widget-primary-contrast': '#FFFFFF',
    '--oven-widget-surface': '#E8EAF6',
    '--oven-widget-background': '#FAFAFE',
    '--oven-widget-text': '#283593',
    '--oven-widget-text-secondary': '#7986CB',
    '--oven-widget-border': '#C5CAE9',
    '--oven-widget-border-radius': '12px',
    '--oven-widget-font-family': "'Inter', system-ui, sans-serif",
    '--oven-widget-bubble-user': '#5C6BC0',
    '--oven-widget-bubble-assistant': '#E8EAF6',
    '--oven-widget-max-width': '400px',
    '--oven-widget-max-height': '600px',
  },
};
