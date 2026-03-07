import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';

interface FormOption {
  id: number;
  name: string;
  slug: string;
  status: string;
}

/**
 * Form page node — renders a referenced form.
 * Includes a dropdown to select existing published forms
 * and a button to auto-create a new form.
 */
export function FormPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  const [forms, setForms] = useState<FormOption[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch available published forms
  useEffect(() => {
    async function fetchForms() {
      setLoadingForms(true);
      try {
        const res = await fetch('/api/forms?status=published');
        if (res.ok) {
          const data = await res.json();
          setForms(Array.isArray(data) ? data : data.data || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingForms(false);
      }
    }
    fetchForms();
  }, []);

  // Handle form selection
  const handleFormChange = useCallback((event: any) => {
    const slug = event.target.value;
    if (d?.onFormRefChange) {
      d.onFormRefChange(slug);
    }
  }, [d]);

  // Auto-create a new form
  const handleCreateForm = useCallback(async () => {
    setCreating(true);
    try {
      const formName = d?.title ? `${d.title} Form` : 'New Form';
      const formSlug = formName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          description: `Auto-created form for ${d?.title || 'page'}`,
          status: 'draft',
          definition: {
            components: [
              {
                id: 'auto-heading',
                type: 'oven-heading',
                props: { text: formName, level: 'h2' },
              },
              {
                id: 'auto-container',
                type: 'oven-container',
                props: { padding: '1rem' },
                children: [],
              },
            ],
            styles: [],
          },
        }),
      });

      if (res.ok) {
        const newForm = await res.json();
        // Update forms list
        setForms((prev: FormOption[]) => [...prev, { id: newForm.id, name: newForm.name, slug: newForm.slug, status: newForm.status }]);
        // Set the formRef on this node
        if (d?.onFormRefChange) {
          d.onFormRefChange(newForm.slug);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  }, [d]);

  return (
    <Box
      sx={{
        bgcolor: '#fff3e0',
        border: '2px solid',
        borderColor: selected ? '#e65100' : '#ff9800',
        borderRadius: 2,
        p: 1.5,
        minWidth: 220,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 1 }}>
        <DescriptionIcon sx={{ fontSize: 18, color: '#e65100' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#e65100' }}>
          Form
        </Typography>
      </Box>

      {d?.title && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
          {d.title}
        </Typography>
      )}

      {d?.slug && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', display: 'block', mb: 1 }}>
          /{d.slug}
        </Typography>
      )}

      {/* Form picker dropdown */}
      <FormControl size="small" fullWidth sx={{ mb: 1, textAlign: 'left' }}>
        <InputLabel sx={{ fontSize: 11 }}>Form</InputLabel>
        <Select
          value={d?.formRef || ''}
          onChange={handleFormChange}
          label="Form"
          sx={{ fontSize: 11, height: 32 }}
          disabled={loadingForms}
        >
          <MenuItem value="" sx={{ fontSize: 11 }}>
            <em>None</em>
          </MenuItem>
          {forms.map((form) => (
            <MenuItem key={form.slug} value={form.slug} sx={{ fontSize: 11 }}>
              {form.name}
              {form.status === 'draft' && (
                <Chip label="draft" size="small" sx={{ ml: 0.5, height: 16, fontSize: 9 }} />
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Create new form button */}
      <Button
        size="small"
        startIcon={creating ? <CircularProgress size={12} /> : <AddIcon sx={{ fontSize: 14 }} />}
        onClick={handleCreateForm}
        disabled={creating}
        sx={{ fontSize: 10, textTransform: 'none', color: '#e65100' }}
      >
        {creating ? 'Creating...' : 'New Form'}
      </Button>

      {d?.formRef && (
        <Chip
          label={`→ ${d.formRef}`}
          size="small"
          sx={{ mt: 0.5, height: 18, fontSize: 9, bgcolor: '#ff980020', display: 'block' }}
        />
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
