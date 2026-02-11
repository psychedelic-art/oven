import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PayloadProperty } from '@oven/module-workflows/types';

interface TriggerSchemaEditorProps {
  /** Current payload schema */
  schema: PayloadProperty[];
  /** Callback when schema changes */
  onChange: (schema: PayloadProperty[]) => void;
}

const TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

/**
 * Editor for defining the payload schema of a workflow trigger.
 * Users add/remove properties with name, type, required flag, and description.
 * This schema is used downstream by InputMapper for variable autocomplete.
 */
export function TriggerSchemaEditor({ schema, onChange }: TriggerSchemaEditorProps) {
  const addProperty = () => {
    onChange([
      ...schema,
      { name: '', type: 'string', required: false },
    ]);
  };

  const removeProperty = (index: number) => {
    onChange(schema.filter((_, i) => i !== index));
  };

  const updateProperty = (index: number, updates: Partial<PayloadProperty>) => {
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...updates };
    onChange(newSchema);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase' }}>
          Payload Schema
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addProperty}
          sx={{ textTransform: 'none', fontSize: 11 }}
        >
          Add Property
        </Button>
      </Box>

      {schema.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 1 }}>
          No payload properties defined. Add properties to define what data this workflow receives.
        </Typography>
      )}

      {schema.map((prop, index) => (
        <Box
          key={index}
          sx={{
            mb: 1,
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Name"
              value={prop.name}
              onChange={(e: any) => updateProperty(index, { name: e.target.value })}
              sx={{ flex: 1, '& input': { fontSize: 12, fontFamily: 'monospace' } }}
            />
            <Select
              size="small"
              value={prop.type}
              onChange={(e: any) => updateProperty(index, { type: e.target.value })}
              sx={{ width: 95, fontSize: 12 }}
              renderValue={(val) => (
                <Chip
                  label={val}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    bgcolor: TYPE_COLORS[val] ?? '#757575',
                    color: '#fff',
                  }}
                />
              )}
            >
              {TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>
                  <Chip
                    label={t}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 9,
                      bgcolor: TYPE_COLORS[t],
                      color: '#fff',
                      mr: 1,
                    }}
                  />
                  {t}
                </MenuItem>
              ))}
            </Select>
            <IconButton size="small" onClick={() => removeProperty(index)} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Description"
              value={prop.description ?? ''}
              onChange={(e: any) => updateProperty(index, { description: e.target.value })}
              sx={{ flex: 1, '& input': { fontSize: 11 } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={prop.required ?? false}
                  onChange={(e: any) => updateProperty(index, { required: e.target.checked })}
                />
              }
              label={<Typography variant="caption" sx={{ fontSize: 10 }}>Req</Typography>}
              sx={{ mr: 0 }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
