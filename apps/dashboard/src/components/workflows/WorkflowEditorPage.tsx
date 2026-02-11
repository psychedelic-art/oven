'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { WorkflowCanvas } from '@oven/workflow-editor';
import type { NodeTypeDefinition, WorkflowDefinition } from '@oven/module-workflows/types';

/**
 * Full-page visual workflow editor.
 * Route: /#/workflows/:id/editor
 */
export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<any>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeTypeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workflow + node types in parallel
  useEffect(() => {
    async function load() {
      try {
        const [workflowRes, nodeTypesRes] = await Promise.all([
          fetch(`/api/workflows/${id}`),
          fetch('/api/node-types'),
        ]);

        if (!workflowRes.ok) throw new Error('Failed to load workflow');
        if (!nodeTypesRes.ok) throw new Error('Failed to load node types');

        const wf = await workflowRes.json();
        const nt = await nodeTypesRes.json();

        setWorkflow(wf);
        setNodeTypes(Array.isArray(nt) ? nt : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Save handler — updates the workflow definition
  const handleSave = async (definition: WorkflowDefinition) => {
    const response = await fetch(`/api/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const updated = await response.json();
    setWorkflow(updated);
  };

  // Execute handler — now receives typed payload from ExecuteDialog
  const handleExecute = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/workflows/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Execution failed');
    }

    const result = await response.json();
    if (result.executionId) {
      navigate(`/workflow-executions/${result.executionId}/show`);
    }
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
        <Button onClick={() => navigate('/workflows')}>Back to Workflows</Button>
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
        <IconButton size="small" onClick={() => navigate(`/workflows/${id}/show`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {workflow?.name ?? 'Workflow Editor'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          v{workflow?.version ?? 1}
        </Typography>
      </Box>

      {/* Editor canvas */}
      <Box sx={{ flex: 1 }}>
        <WorkflowCanvas
          workflowId={workflow?.id ?? 0}
          workflowSlug={workflow?.slug ?? 'workflow'}
          initialDefinition={workflow?.definition as WorkflowDefinition}
          availableNodeTypes={nodeTypes}
          onSave={handleSave}
          onExecute={handleExecute}
        />
      </Box>
    </Box>
  );
}
