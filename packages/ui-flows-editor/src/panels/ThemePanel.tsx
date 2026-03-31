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
  Button,
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

      <Divider sx={{ my: 2 }} />

      {/* Live Preview Swatch */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
        Preview
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {/* Mini header bar */}
        <Box
          sx={{
            bgcolor: theme.primaryColor || '#1976D2',
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {theme.logoUrl && (
            <Box
              component="img"
              src={theme.logoUrl}
              alt="Logo"
              sx={{ height: 20, width: 'auto', objectFit: 'contain' }}
            />
          )}
          <Typography
            sx={{
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: theme.fontFamily || 'Inter, sans-serif',
            }}
          >
            My Portal
          </Typography>
        </Box>

        {/* Mini content area */}
        <Box
          sx={{
            bgcolor: theme.backgroundColor || '#ffffff',
            p: 1.5,
            display: 'flex',
            gap: 1,
          }}
        >
          {/* Mini sidebar nav */}
          <Box sx={{ width: 60, flexShrink: 0 }}>
            <Box
              sx={{
                bgcolor: theme.primaryColor || '#1976D2',
                color: 'white',
                fontSize: 8,
                px: 0.75,
                py: 0.5,
                borderRadius: `${(theme.borderRadius ?? 8) / 4}px`,
                mb: 0.5,
                fontFamily: theme.fontFamily || 'Inter, sans-serif',
              }}
            >
              Home
            </Box>
            <Box
              sx={{
                bgcolor: 'grey.100',
                fontSize: 8,
                px: 0.75,
                py: 0.5,
                borderRadius: `${(theme.borderRadius ?? 8) / 4}px`,
                mb: 0.5,
                fontFamily: theme.fontFamily || 'Inter, sans-serif',
              }}
            >
              About
            </Box>
            <Box
              sx={{
                bgcolor: 'grey.100',
                fontSize: 8,
                px: 0.75,
                py: 0.5,
                borderRadius: `${(theme.borderRadius ?? 8) / 4}px`,
                fontFamily: theme.fontFamily || 'Inter, sans-serif',
              }}
            >
              Contact
            </Box>
          </Box>

          {/* Mini page content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                mb: 0.5,
                fontFamily: theme.fontFamily || 'Inter, sans-serif',
                color: 'text.primary',
              }}
            >
              Welcome
            </Typography>
            <Typography
              sx={{
                fontSize: 8,
                mb: 1,
                fontFamily: theme.fontFamily || 'Inter, sans-serif',
                color: 'text.secondary',
                lineHeight: 1.3,
              }}
            >
              Your portal preview with live theme colors and fonts.
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant="contained"
                sx={{
                  bgcolor: theme.primaryColor || '#1976D2',
                  fontSize: 8,
                  py: 0.25,
                  px: 1,
                  minWidth: 0,
                  borderRadius: `${(theme.borderRadius ?? 8) / 2}px`,
                  textTransform: 'none',
                  fontFamily: theme.fontFamily || 'Inter, sans-serif',
                  '&:hover': { bgcolor: theme.primaryColor || '#1976D2' },
                }}
              >
                Primary
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  borderColor: theme.secondaryColor || '#dc004e',
                  color: theme.secondaryColor || '#dc004e',
                  fontSize: 8,
                  py: 0.25,
                  px: 1,
                  minWidth: 0,
                  borderRadius: `${(theme.borderRadius ?? 8) / 2}px`,
                  textTransform: 'none',
                  fontFamily: theme.fontFamily || 'Inter, sans-serif',
                }}
              >
                Secondary
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
