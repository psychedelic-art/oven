import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Slider,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ThemeConfig } from '@oven/module-ui-flows/types';

interface ThemePanelProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
  onClose: () => void;
}

/**
 * Right-side panel for editing portal theme.
 */
export function ThemePanel({ theme, onChange, onClose }: ThemePanelProps) {
  const update = (key: keyof ThemeConfig, value: any) => {
    onChange({ ...theme, [key]: value });
  };

  return (
    <Box
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">Theme</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Colors */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Colors
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <input
          type="color"
          value={theme.primaryColor || '#1976D2'}
          onChange={(e) => update('primaryColor', e.target.value)}
          style={{ width: 32, height: 32, border: 'none', cursor: 'pointer' }}
        />
        <TextField
          size="small"
          label="Primary"
          value={theme.primaryColor || '#1976D2'}
          onChange={(e: any) => update('primaryColor', e.target.value)}
          fullWidth
          sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <input
          type="color"
          value={theme.secondaryColor || '#dc004e'}
          onChange={(e) => update('secondaryColor', e.target.value)}
          style={{ width: 32, height: 32, border: 'none', cursor: 'pointer' }}
        />
        <TextField
          size="small"
          label="Secondary"
          value={theme.secondaryColor || '#dc004e'}
          onChange={(e: any) => update('secondaryColor', e.target.value)}
          fullWidth
          sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <input
          type="color"
          value={theme.backgroundColor || '#ffffff'}
          onChange={(e) => update('backgroundColor', e.target.value)}
          style={{ width: 32, height: 32, border: 'none', cursor: 'pointer' }}
        />
        <TextField
          size="small"
          label="Background"
          value={theme.backgroundColor || '#ffffff'}
          onChange={(e: any) => update('backgroundColor', e.target.value)}
          fullWidth
          sx={{ '& input': { fontFamily: 'monospace', fontSize: 12 } }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Typography */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Typography
      </Typography>

      <Select
        size="small"
        value={theme.fontFamily || 'Inter, sans-serif'}
        onChange={(e: any) => update('fontFamily', e.target.value)}
        fullWidth
        sx={{ mb: 1.5 }}
      >
        <MenuItem value="Inter, sans-serif">Inter</MenuItem>
        <MenuItem value="Roboto, sans-serif">Roboto</MenuItem>
        <MenuItem value="'Open Sans', sans-serif">Open Sans</MenuItem>
        <MenuItem value="Lato, sans-serif">Lato</MenuItem>
        <MenuItem value="Poppins, sans-serif">Poppins</MenuItem>
        <MenuItem value="'Nunito Sans', sans-serif">Nunito Sans</MenuItem>
        <MenuItem value="system-ui, sans-serif">System UI</MenuItem>
      </Select>

      <Divider sx={{ my: 2 }} />

      {/* Branding */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Branding
      </Typography>

      <TextField
        size="small"
        label="Logo URL"
        value={theme.logoUrl || ''}
        onChange={(e: any) => update('logoUrl', e.target.value)}
        fullWidth
        sx={{ mb: 1.5 }}
        helperText="URL to the portal logo image"
      />

      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
        Border Radius: {theme.borderRadius ?? 8}px
      </Typography>
      <Slider
        value={theme.borderRadius ?? 8}
        onChange={(_: any, val: any) => update('borderRadius', val as number)}
        min={0}
        max={24}
        step={2}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      {/* Custom CSS */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Custom CSS
      </Typography>
      <TextField
        size="small"
        label="Custom Styles"
        value={theme.customCss || ''}
        onChange={(e: any) => update('customCss', e.target.value)}
        fullWidth
        multiline
        rows={4}
        sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
        helperText="Additional CSS to inject into the portal"
      />
    </Box>
  );
}
