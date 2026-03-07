'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { FormEditor } from '@oven/form-editor';
import type { EditorConfig, EditorState, FormDefinitionData, BlockDefinition } from '@oven/form-editor';

/**
 * Full-page visual form editor using GrapeJS.
 * Route: /#/forms/:id/editor
 */
export default function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [blocks, setBlocks] = useState<BlockDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastState, setLastState] = useState<EditorState | null>(null);

  // Load form + component blocks in parallel
  useEffect(() => {
    async function load() {
      try {
        const [formRes, blocksRes] = await Promise.all([
          fetch(`/api/forms/${id}`),
          fetch('/api/form-components'),
        ]);
        if (!formRes.ok) throw new Error('Failed to load form');
        const formData = await formRes.json();
        setForm(formData);

        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          // Map API form_components to BlockDefinition format
          const mapped: BlockDefinition[] = (blocksData.data || blocksData || []).map(
            (c: Record<string, unknown>) => ({
              id: c.slug as string,
              label: c.name as string,
              category: (c.category as string) || 'general',
              content: (c.template as string) || `<div data-oven-type="${c.slug}"></div>`,
              defaultProps: c.defaultProps as Record<string, unknown> | undefined,
              dataContract: c.dataContract as BlockDefinition['dataContract'] | undefined,
            }),
          );
          setBlocks(mapped);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Save handler
  const handleSave = useCallback(
    async (state: EditorState) => {
      setSaving(true);
      try {
        const response = await fetch(`/api/forms/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            definition: {
              components: state.components,
              styles: state.styles,
              projectData: state.projectData,
            },
          }),
        });
        if (!response.ok) {
          const err = await response.text();
          throw new Error(err);
        }
        const updated = await response.json();
        setForm(updated);
      } catch (err) {
        console.error('[FormEditorPage] Save failed:', err);
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  // Editor config
  const editorConfig: EditorConfig = useMemo(
    () => ({
      definition: form?.definition as FormDefinitionData | undefined,
      blocks,
      onChange: (state: EditorState) => setLastState(state),
      onSave: handleSave,
      apiBaseUrl: '/api',
    }),
    [form?.definition, blocks, handleSave],
  );

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
        <Button onClick={() => navigate('/forms')}>Back to Forms</Button>
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
        <IconButton size="small" onClick={() => navigate(`/forms/${id}/show`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {(form?.name as string) ?? 'Form Editor'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          v{(form?.version as number) ?? 1}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          disabled={saving || !lastState}
          onClick={() => lastState && handleSave(lastState)}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>

      {/* GrapeJS editor canvas */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <FormEditor config={editorConfig} />
      </Box>
    </Box>
  );
}
