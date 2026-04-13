'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

// ─── Config Keys ────────────────────────────────────────────
// These are stored via the module-config cascade as module=dashboard-ux,
// scope=module, key=PLAYGROUND_*.

const CONFIG_MODULE = 'dashboard-ux';

const THEME_PRESETS = [
  'light', 'dark', 'ocean', 'forest', 'sunset',
  'corporate', 'minimal', 'neon', 'warm', 'cool',
] as const;

interface PlaygroundConfig {
  PLAYGROUND_THEME: string;
  PLAYGROUND_SESSION_SIDEBAR: boolean;
  PLAYGROUND_CAN_CREATE_SESSION: boolean;
  PLAYGROUND_CAN_DELETE_SESSION: boolean;
  PLAYGROUND_CAN_PIN_SESSION: boolean;
  PLAYGROUND_CAN_STOP: boolean;
  PLAYGROUND_CONNECTION_STATUS: boolean;
  PLAYGROUND_EXECUTION_HISTORY: boolean;
  PLAYGROUND_LAYOUT_TOGGLE: boolean;
  PLAYGROUND_THEME_TOGGLE: boolean;
}

const DEFAULTS: PlaygroundConfig = {
  PLAYGROUND_THEME: 'light',
  PLAYGROUND_SESSION_SIDEBAR: true,
  PLAYGROUND_CAN_CREATE_SESSION: true,
  PLAYGROUND_CAN_DELETE_SESSION: true,
  PLAYGROUND_CAN_PIN_SESSION: true,
  PLAYGROUND_CAN_STOP: true,
  PLAYGROUND_CONNECTION_STATUS: true,
  PLAYGROUND_EXECUTION_HISTORY: true,
  PLAYGROUND_LAYOUT_TOGGLE: true,
  PLAYGROUND_THEME_TOGGLE: true,
};

// ─── Component ──────────────────────────────────────────────

export function PlaygroundConfigPage() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  const [config, setConfig] = useState<PlaygroundConfig>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ─── Load config ──────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const keys = Object.keys(DEFAULTS).join(',');
      const tenantParam = activeTenantId ? `&tenantId=${activeTenantId}` : '';
      const res = await fetch(
        `/api/module-configs/resolve-batch?moduleName=${CONFIG_MODULE}&keys=${keys}${tenantParam}`,
      );
      if (!res.ok) {
        // If resolve-batch doesn't exist yet, use defaults silently
        if (res.status === 404) {
          setConfig(DEFAULTS);
          return;
        }
        throw new Error(`Failed to load config: ${res.status}`);
      }
      const data = await res.json();
      const results = data.results ?? data;
      const merged = { ...DEFAULTS };
      for (const [key, entry] of Object.entries(results)) {
        if (key in merged) {
          const val = (entry as { value: unknown }).value;
          if (val !== undefined && val !== null) {
            (merged as Record<string, unknown>)[key] = val;
          }
        }
      }
      setConfig(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ─── Save config ──────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      for (const [key, value] of Object.entries(config)) {
        await fetch('/api/module-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleName: CONFIG_MODULE,
            key,
            value: JSON.stringify(value),
            scope: 'module',
            ...(activeTenantId ? { tenantId: activeTenantId } : {}),
          }),
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────

  const toggle = (key: keyof PlaygroundConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ─── Render ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 3, px: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
        Playground Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the AI Playground experience
        {activeTenantId ? ' for this tenant' : ' (platform defaults)'}.
        These settings control which features are available in the playground
        interface.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Configuration saved.</Alert>}

      {/* Theme */}
      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Theme
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ minWidth: 140 }}>
            Default theme
          </Typography>
          <Select
            size="small"
            value={config.PLAYGROUND_THEME}
            onChange={(e) => setConfig(prev => ({ ...prev, PLAYGROUND_THEME: e.target.value }))}
            sx={{ minWidth: 160 }}
          >
            {THEME_PRESETS.map(t => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_THEME_TOGGLE as boolean}
              onChange={() => toggle('PLAYGROUND_THEME_TOGGLE')}
            />
          }
          label="Show theme toggle in playground header"
        />
      </Paper>

      {/* Session Management */}
      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Session Management
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_SESSION_SIDEBAR as boolean}
              onChange={() => toggle('PLAYGROUND_SESSION_SIDEBAR')}
            />
          }
          label="Show session sidebar"
        />
        <Divider sx={{ my: 1 }} />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_CAN_CREATE_SESSION as boolean}
              onChange={() => toggle('PLAYGROUND_CAN_CREATE_SESSION')}
              disabled={!config.PLAYGROUND_SESSION_SIDEBAR}
            />
          }
          label="Allow creating new sessions"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_CAN_DELETE_SESSION as boolean}
              onChange={() => toggle('PLAYGROUND_CAN_DELETE_SESSION')}
              disabled={!config.PLAYGROUND_SESSION_SIDEBAR}
            />
          }
          label="Allow deleting sessions"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_CAN_PIN_SESSION as boolean}
              onChange={() => toggle('PLAYGROUND_CAN_PIN_SESSION')}
              disabled={!config.PLAYGROUND_SESSION_SIDEBAR}
            />
          }
          label="Allow pinning sessions"
        />
      </Paper>

      {/* Features */}
      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Features
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_CAN_STOP as boolean}
              onChange={() => toggle('PLAYGROUND_CAN_STOP')}
            />
          }
          label="Show stop button during streaming"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_CONNECTION_STATUS as boolean}
              onChange={() => toggle('PLAYGROUND_CONNECTION_STATUS')}
            />
          }
          label="Show connection status indicator"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_EXECUTION_HISTORY as boolean}
              onChange={() => toggle('PLAYGROUND_EXECUTION_HISTORY')}
            />
          }
          label="Show workflow execution history"
        />
        <FormControlLabel
          control={
            <Switch
              checked={config.PLAYGROUND_LAYOUT_TOGGLE as boolean}
              onChange={() => toggle('PLAYGROUND_LAYOUT_TOGGLE')}
            />
          }
          label="Show layout mode toggle (fullscreen)"
        />
      </Paper>

      {/* Save */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={loadConfig}
          disabled={isSaving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          sx={{ textTransform: 'none' }}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>
    </Box>
  );
}
