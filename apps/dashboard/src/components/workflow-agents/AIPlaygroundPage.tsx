'use client';

// This file is intentionally thin — a dashboard shell around the canonical
// `UnifiedAIPlayground` from `@oven/agent-ui`. Do NOT add chat UI here; the
// playground must remain MUI-free and router-free inside agent-ui so it can be
// embedded in any host (docs, script tag, external apps).

import { useNavigate } from 'react-router-dom';
import { DashboardPlaygroundShell } from '@oven/dashboard-ui';
import './ai-playground.css';

export function AIPlaygroundPage() {
  const navigate = useNavigate();

  return (
    <DashboardPlaygroundShell
      title="AI Playground"
      showBackButton
      onBack={() => navigate('/')}
      showSessionSidebar
      showThemeToggle
      showConnectionStatus
      showLayoutToggle
      showExecutionHistory
      showTenantSelector
      sessionConfig={{
        canCreate: true,
        canDelete: true,
        canPin: true,
        canStop: true,
      }}
      initialTheme="light"
    />
  );
}
