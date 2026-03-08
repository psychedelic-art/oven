'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { FormEditor } from '@oven/form-editor';
import type { EditorConfig, EditorState, FormDefinitionData, BlockDefinition, DiscoveryData } from '@oven/form-editor';
import { renderComponentTree, FormProvider } from '@oven/oven-ui';
import type { FormDefinition } from '@oven/oven-ui';
import { TailwindPreviewFrame } from './TailwindPreviewFrame';

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
  const [preview, setPreview] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryData>({});

  // Load form + component blocks in parallel
  useEffect(() => {
    async function load() {
      try {
        const [formRes, blocksRes, workflowsRes, endpointsRes] = await Promise.all([
          fetch(`/api/forms/${id}`),
          fetch('/api/form-components?range=[0,99]'),
          fetch('/api/form-discovery?type=workflows').catch(() => null),
          fetch('/api/form-discovery?type=endpoints').catch(() => null),
        ]);
        if (!formRes.ok) throw new Error('Failed to load form');
        const formData = await formRes.json();
        setForm(formData);

        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          // Map API form_components to BlockDefinition format
          const mapped: BlockDefinition[] = (blocksData.data || blocksData || []).map(
            (c: Record<string, unknown>) => {
              const def = c.definition as Record<string, unknown> | undefined;
              return {
                id: c.slug as string,
                label: c.name as string,
                category: (c.category as string) || 'general',
                content: (def?.template as string) || `<div data-gjs-type="${c.slug}"></div>`,
                defaultProps: c.defaultProps as Record<string, unknown> | undefined,
                dataContract: c.dataContract as BlockDefinition['dataContract'] | undefined,
              };
            },
          );
          setBlocks(mapped);
        }

        // Load discovery data for trait dropdowns (workflows + API endpoints)
        const discoveryData: DiscoveryData = {};
        if (workflowsRes?.ok) {
          discoveryData.workflows = await workflowsRes.json();
        }
        if (endpointsRes?.ok) {
          discoveryData.apiEndpoints = await endpointsRes.json();
        }
        setDiscovery(discoveryData);
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
      discovery,
      onChange: (state: EditorState) => setLastState(state),
      onSave: handleSave,
      apiBaseUrl: '/api',
    }),
    [form?.definition, blocks, discovery, handleSave],
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
          variant={preview ? 'contained' : 'outlined'}
          size="small"
          startIcon={preview ? <EditIcon /> : <VisibilityIcon />}
          onClick={() => setPreview((p) => !p)}
          sx={{ textTransform: 'none', mr: 1 }}
        >
          {preview ? 'Editor' : 'Preview'}
        </Button>
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

      {/* GrapeJS editor canvas — hidden during preview to preserve state */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: preview ? 'none' : 'block' }}>
        <FormEditor config={editorConfig} />
      </Box>

      {/* Preview mode — renders actual React components inside a Tailwind iframe */}
      {preview && lastState?.components?.length ? (
        <TailwindPreviewFrame>
          <FormProvider
            definition={{ components: lastState.components } as FormDefinition}
          >
            {renderComponentTree(lastState.components)}
          </FormProvider>
        </TailwindPreviewFrame>
      ) : preview ? (
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography color="text.secondary">
            No components to preview. Add components in the editor first.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
