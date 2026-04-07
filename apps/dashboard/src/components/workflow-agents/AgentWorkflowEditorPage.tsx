'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AgentWorkflowCanvas } from '@oven/agent-workflow-editor';

/**
 * Full-page visual agent workflow editor.
 * Route: /#/agent-workflows/:id/editor
 */
export function AgentWorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agent-workflows/${id}`);
        if (!res.ok) throw new Error('Failed to load workflow');
        const data = await res.json();
        setWorkflow(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async (data: { definition: Record<string, unknown>; agentConfig: Record<string, unknown>; memoryConfig: Record<string, unknown> }) => {
    try {
      const res = await fetch(`/api/agent-workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition: data.definition,
          agentConfig: data.agentConfig,
          memoryConfig: data.memoryConfig,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setWorkflow(updated);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleExecute = async () => {
    try {
      const res = await fetch(`/api/agent-workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerSource: 'editor', payload: {} }),
      });
      if (!res.ok) throw new Error('Execute failed');
      const result = await res.json();
      // Navigate to execution detail
      navigate(`/agent-workflow-executions/${result.executionId}/show`);
    } catch (err) {
      console.error('Execute error:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !workflow) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 2 }}>
        <Typography color="error">{error ?? 'Workflow not found'}</Typography>
        <Button onClick={() => navigate('/agent-workflows')}>Back to list</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <IconButton onClick={() => navigate('/agent-workflows')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {(workflow.name as string) ?? 'Agent Workflow'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          #{id} · v{workflow.version as number ?? 1}
        </Typography>
      </Box>

      {/* Canvas */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <AgentWorkflowCanvas
          workflowId={Number(id)}
          definition={workflow.definition as Record<string, unknown>}
          agentConfig={workflow.agentConfig as Record<string, unknown> | undefined}
          memoryConfig={workflow.memoryConfig as Record<string, unknown> | undefined}
          onSave={handleSave}
          onExecute={handleExecute}
        />
      </Box>
    </Box>
  );
}
