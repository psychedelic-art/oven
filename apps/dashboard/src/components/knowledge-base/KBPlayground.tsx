'use client';

// KB Playground — thin dashboard wrapper around UnifiedAIPlayground.
//
// The original 782-line standalone KBPlayground has been preserved as
// KBPlayground.legacy.tsx for reference. This rewrite mounts the canonical
// UnifiedAIPlayground via DashboardPlaygroundShell with KB-appropriate defaults.
//
// The legacy file contains the hand-built 3-panel KB search/entries/stats
// interface. If any of those KB-specific features (semantic search results
// with confidence scores, embedding status badges, re-embed triggers) need
// to be ported into the unified playground, the legacy file is the source.

import { useNavigate } from 'react-router-dom';
import { DashboardPlaygroundShell } from '@oven/dashboard-ui';
import '../workflow-agents/ai-playground.css';

export default function KBPlayground() {
  const navigate = useNavigate();

  return (
    <DashboardPlaygroundShell
      title="Knowledge Base Playground"
      showBackButton
      onBack={() => navigate('/')}
      showSessionSidebar
      showThemeToggle
      showConnectionStatus
      showExecutionHistory
      showTenantSelector
      sessionConfig={{
        canCreate: true,
        canDelete: true,
        canPin: true,
        canStop: true,
      }}
      defaultMode="agent"
      initialTheme="light"
    />
  );
}
