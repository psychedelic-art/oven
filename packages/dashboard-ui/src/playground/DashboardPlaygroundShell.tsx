'use client';

import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { UnifiedAIPlayground } from '@oven/agent-ui';
import type { SessionConfig } from '@oven/agent-ui/playground';
import type { ThemePresetName } from '@oven/agent-ui/themes';
import { useTenantContext } from '../tenant/useTenantContext';
import { TenantSelector } from '../tenant/TenantSelector';

// ─── Props ──────────────────────────────────────────────────

export interface DashboardPlaygroundShellProps {
  /** Page title shown in the MUI header bar. */
  title?: string;
  /** Show a back button that calls onBack. */
  showBackButton?: boolean;
  /** Callback for the back button. */
  onBack?: () => void;

  // ── Feature toggles (forwarded to UnifiedAIPlayground) ────
  showSessionSidebar?: boolean;
  showThemeToggle?: boolean;
  showConnectionStatus?: boolean;
  showLayoutToggle?: boolean;
  showExecutionHistory?: boolean;
  sessionConfig?: SessionConfig;

  // ── Data injection from dashboard context ─────────────────
  /** Override tenantId. If omitted, reads from useTenantContext. */
  tenantId?: number;
  /** Override tenantSlug. If omitted, defaults to 'default'. */
  tenantSlug?: string;
  /** Initial theme preset for the playground. */
  initialTheme?: ThemePresetName;
  /** Playground target mode: agent or workflow. */
  defaultMode?: 'agent' | 'workflow';
  /** Show the tenant selector in the header bar. */
  showTenantSelector?: boolean;
}

// ─── Component ──────────────────────────────────────────────

/**
 * MUI wrapper around UnifiedAIPlayground from @oven/agent-ui.
 *
 * The style boundary is at the Box container — MUI sx above (this file),
 * Tailwind + cn() inside (agent-ui). This follows the existing pattern
 * from workflow-agents/AIPlaygroundPage.tsx.
 *
 * This shell injects:
 * - Tenant context (from useTenantContext or explicit props)
 * - A MUI header bar with back button, title, and tenant selector
 * - All feature toggle props forwarded to the playground
 */
export function DashboardPlaygroundShell({
  title = 'AI Playground',
  showBackButton = false,
  onBack,
  showSessionSidebar = false,
  showThemeToggle = false,
  showConnectionStatus = false,
  showLayoutToggle = false,
  showExecutionHistory = false,
  sessionConfig,
  tenantId: tenantIdProp,
  tenantSlug = 'default',
  initialTheme = 'light',
  defaultMode = 'agent',
  showTenantSelector = false,
}: DashboardPlaygroundShellProps) {
  // Read tenant from context if not explicitly provided
  let resolvedTenantId = tenantIdProp;
  try {
    const contextTenantId = useTenantContext((s) => s.activeTenantId);
    if (resolvedTenantId === undefined && contextTenantId !== null) {
      resolvedTenantId = contextTenantId;
    }
  } catch {
    // useTenantContext throws if not inside TenantContextProvider.
    // Dashboard pages are wrapped, but embedded uses may not be.
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ─── MUI Header Bar ──────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        {showBackButton && onBack && (
          <IconButton size="small" onClick={onBack} aria-label="Back">
            <Box
              component="span"
              sx={{ fontSize: 18, display: 'flex', alignItems: 'center' }}
            >
              &#x2190;
            </Box>
          </IconButton>
        )}
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        {showTenantSelector && (
          <TenantSelector label="Tenant" allowAllOption={false} />
        )}
      </Box>

      {/* ─── Playground Surface (Tailwind boundary) ──────────── */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <UnifiedAIPlayground
          apiBaseUrl=""
          tenantSlug={tenantSlug}
          tenantId={resolvedTenantId}
          defaultMode={defaultMode}
          showSessionSidebar={showSessionSidebar}
          sessionConfig={sessionConfig}
          showThemeToggle={showThemeToggle}
          initialTheme={initialTheme}
          showConnectionStatus={showConnectionStatus}
          showLayoutToggle={showLayoutToggle}
          showExecutionHistory={showExecutionHistory}
        />
      </Box>
    </Box>
  );
}
