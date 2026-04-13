'use client';

// Agent Playground Panel — collapsible inline panel embedded in AgentEdit.
//
// The original hand-rolled chat UI (146 lines) has been preserved as
// AgentPlaygroundPanel.legacy.tsx for reference. This rewrite embeds
// the canonical UnifiedAIPlayground inside a collapsible MUI panel,
// giving it session management, theme toggle, and all playground features
// while keeping the compact inline UX for the agent edit page.

import { useState } from 'react';
import {
  Box, Typography, Chip, Divider, Collapse, IconButton, Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { UnifiedAIPlayground } from '@oven/agent-ui';
import '../workflow-agents/ai-playground.css';

interface AgentPlaygroundPanelProps {
  agentId: number;
  agentName: string;
}

export default function AgentPlaygroundPanel({ agentId, agentName }: AgentPlaygroundPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider />
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <SmartToyIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Test Agent
        </Typography>
        <Chip label={agentName} size="small" variant="outlined" />
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ height: 500, overflow: 'hidden' }}>
          {expanded && (
            <UnifiedAIPlayground
              apiBaseUrl=""
              tenantSlug="default"
              defaultMode="agent"
              showSessionSidebar
              sessionConfig={{
                canCreate: true,
                canDelete: true,
                canPin: false,
                canStop: true,
              }}
              showThemeToggle={false}
              showConnectionStatus={false}
              showLayoutToggle={false}
              showExecutionHistory={false}
            />
          )}
        </Paper>
      </Collapse>
    </Box>
  );
}
