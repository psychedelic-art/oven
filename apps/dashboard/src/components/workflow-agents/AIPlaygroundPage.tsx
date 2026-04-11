'use client';

// This file is intentionally thin — a dashboard shell around the canonical
// `UnifiedAIPlayground` from `@oven/agent-ui`. Do NOT add chat UI here; the
// playground must remain MUI-free and router-free inside agent-ui so it can be
// embedded in any host (docs, script tag, external apps).

import { Box, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { UnifiedAIPlayground } from '@oven/agent-ui';
import './ai-playground.css';

export function AIPlaygroundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
        <IconButton size="small" onClick={() => navigate('/')} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          AI Playground
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <UnifiedAIPlayground apiBaseUrl="" tenantSlug="default" />
      </Box>
    </Box>
  );
}
