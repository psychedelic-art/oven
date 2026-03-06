'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { UiFlowCanvas } from '@oven/ui-flows-editor';
import type { UiFlowDefinition, ThemeConfig } from '@oven/module-ui-flows/types';

/**
 * Full-page visual UI flow editor.
 * Route: /#/ui-flows/:id/editor
 */
export default function UiFlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load UI flow
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/ui-flows/${id}`);
        if (!res.ok) throw new Error('Failed to load UI flow');
        const data = await res.json();
        setFlow(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Save handler — updates definition + theme
  const handleSave = async (definition: UiFlowDefinition, themeConfig: ThemeConfig) => {
    const response = await fetch(`/api/ui-flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition, themeConfig }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const updated = await response.json();
    setFlow(updated);
  };

  // Publish handler
  const handlePublish = async () => {
    const response = await fetch(`/api/ui-flows/${id}/publish`, {
      method: 'POST',
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Publish failed');
    }

    const updated = await response.json();
    setFlow(updated);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={() => navigate('/ui-flows')}>Back to UI Flows</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <IconButton size="small" onClick={() => navigate(`/ui-flows/${id}/show`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {flow?.name ?? 'UI Flow Editor'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          v{flow?.version ?? 1}
        </Typography>
      </Box>

      {/* Editor canvas */}
      <Box sx={{ flex: 1 }}>
        <UiFlowCanvas
          flowId={flow?.id ?? 0}
          flowSlug={flow?.slug ?? 'flow'}
          flowName={flow?.name ?? 'Untitled'}
          initialDefinition={flow?.definition as UiFlowDefinition}
          initialTheme={flow?.themeConfig as ThemeConfig}
          onSave={handleSave}
          onPublish={handlePublish}
        />
      </Box>
    </Box>
  );
}
