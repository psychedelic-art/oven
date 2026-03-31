import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Divider,
  IconButton,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Node } from '@xyflow/react';

interface FormOption {
  id: number;
  name: string;
  slug: string;
  status: string;
}

interface PageInspectorProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
}

/**
 * Right-side panel for editing page node properties.
 */
export function PageInspector({ selectedNode, onUpdateNode, onClose }: PageInspectorProps) {
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  useEffect(() => {
    async function fetchForms() {
      setLoadingForms(true);
      try {
        const res = await fetch('/api/forms?range=[0,999]');
        if (res.ok) {
          const json = await res.json();
          setForms(Array.isArray(json) ? json : json.data || []);
        }
      } catch {
        // Silently fail — dropdown stays empty
      } finally {
        setLoadingForms(false);
      }
    }
    fetchForms();
  }, []);

  if (!selectedNode) return null;

  const data = (selectedNode.data ?? {}) as Record<string, any>;
  const nodeType = selectedNode.type ?? 'unknown';

  const update = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, { ...data, [key]: value });
  };

  return (
    <Box
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">Page Properties</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary">
        ID: {selectedNode.id}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Type: {nodeType}
      </Typography>

      {/* Common fields */}
      <TextField
        size="small"
        label="Title"
        value={data.title ?? ''}
        onChange={(e: any) => update('title', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        size="small"
        label="Slug"
        value={data.slug ?? ''}
        onChange={(e: any) => {
          const normalized = e.target.value.replace(/^\/+|\/+$/g, '');
          update('slug', normalized);
        }}
        fullWidth
        sx={{ mb: 2 }}
        helperText={
          (data.slug ?? '') === ''
            ? 'Empty = home page (portal root). Visitors see: tenant.domain.com/'
            : "Relative path (e.g. 'contact'). No leading slash. Visitors see: tenant.domain.com/" + (data.slug ?? '')
        }
      />

      <Divider sx={{ mb: 2 }} />

      {/* Form page: form selector */}
      {(nodeType === 'form' || nodeType === 'custom') && (
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Form</InputLabel>
          <Select
            value={data.formRef ?? ''}
            onChange={(e: any) => update('formRef', e.target.value)}
            label="Form"
            disabled={loadingForms}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {forms.map((form) => (
              <MenuItem key={form.id} value={String(form.id)}>
                {form.name}
                {form.status === 'draft' && (
                  <Chip
                    label="draft"
                    size="small"
                    sx={{ ml: 1, height: 18, fontSize: 10 }}
                  />
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Landing page: hero config */}
      {nodeType === 'landing' && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            Hero Section
          </Typography>
          <TextField
            size="small"
            label="Hero Title"
            value={data.heroTitle ?? ''}
            onChange={(e: any) => update('heroTitle', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="Hero Subtitle"
            value={data.heroSubtitle ?? ''}
            onChange={(e: any) => update('heroSubtitle', e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="CTA Button Text"
            value={data.ctaText ?? ''}
            onChange={(e: any) => update('ctaText', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="CTA Link (slug)"
            value={data.ctaLink ?? ''}
            onChange={(e: any) => update('ctaLink', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
            helperText="Page slug to navigate to"
          />
        </>
      )}

      {/* FAQ page */}
      {nodeType === 'faq' && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            FAQ Configuration
          </Typography>
          <TextField
            size="small"
            label="FAQ Items (JSON)"
            value={JSON.stringify(data.faqItems ?? [], null, 2)}
            onChange={(e: any) => {
              try {
                update('faqItems', JSON.parse(e.target.value));
              } catch { /* ignore invalid JSON */ }
            }}
            fullWidth
            multiline
            rows={6}
            sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
            helperText='[{"question":"...","answer":"..."}]'
          />
        </>
      )}

      {/* Chat page */}
      {nodeType === 'chat' && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            Chat Configuration
          </Typography>
          <TextField
            size="small"
            label="Welcome Message"
            value={data.welcomeMessage ?? ''}
            onChange={(e: any) => update('welcomeMessage', e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="Chat Provider"
            value={data.chatProvider ?? ''}
            onChange={(e: any) => update('chatProvider', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
            helperText="e.g. 'agent-ui', 'intercom', 'custom'"
          />
        </>
      )}

      {/* Custom page: content */}
      {nodeType === 'custom' && (
        <TextField
          size="small"
          label="Content (HTML/Markdown)"
          value={data.content ?? ''}
          onChange={(e: any) => update('content', e.target.value)}
          fullWidth
          multiline
          rows={6}
          sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
        />
      )}
    </Box>
  );
}
