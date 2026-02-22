'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { RlsPolicyCanvas } from '@oven/rls-editor';
import type { RlsPolicyDefinition } from '@oven/rls-editor';

export default function RlsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/rls-policies/${id}`);
        if (!res.ok) throw new Error('Failed to load RLS policy');
        setPolicy(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async (definition: RlsPolicyDefinition) => {
    const response = await fetch(`/api/rls-policies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    const updated = await response.json();
    setPolicy(updated);
  };

  const handleApply = async () => {
    const response = await fetch(`/api/rls-policies/${id}/apply`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    const updated = await response.json();
    setPolicy(updated);
  };

  const handlePreview = async (definition: RlsPolicyDefinition): Promise<string | null> => {
    const response = await fetch(`/api/rls-policies/${id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    const result = await response.json();
    return result.fullSql ?? null;
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
        <Button onClick={() => navigate('/rls-policies')}>Back to RLS Policies</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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
        <IconButton size="small" onClick={() => navigate(`/rls-policies/${id}/show`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {policy?.name ?? 'RLS Policy Editor'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          v{policy?.version ?? 1} &middot; {policy?.targetTable}
        </Typography>
      </Box>

      {/* Editor Canvas */}
      <Box sx={{ flex: 1 }}>
        <RlsPolicyCanvas
          policyId={policy?.id ?? 0}
          policySlug={policy?.slug ?? ''}
          targetTable={policy?.targetTable ?? ''}
          initialDefinition={policy?.definition as RlsPolicyDefinition}
          currentVersion={policy?.version ?? 1}
          onSave={handleSave}
          onApply={handleApply}
          onPreview={handlePreview}
        />
      </Box>
    </Box>
  );
}
