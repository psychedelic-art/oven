'use client';

import { Box, Typography, TextField, Select, MenuItem, IconButton, Button, Paper, Checkbox, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description?: string;
  defaultValue?: string;
  required?: boolean;
  options?: string[];
}

interface InputSchemaEditorProps {
  value: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

export default function InputSchemaEditor({ value, onChange }: InputSchemaEditorProps) {
  const fields = value ?? [];

  const addField = () => {
    onChange([...fields, { name: '', type: 'string', description: '', required: false }]);
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">Input Schema</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addField} sx={{ textTransform: 'none' }}>
          Add Variable
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Define dynamic variables that can be inserted into the system prompt as {'{{variableName}}'}
      </Typography>

      {fields.length === 0 && (
        <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
          No input variables defined. Click "Add Variable" to create one.
        </Typography>
      )}

      {fields.map((field, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          {/* Row 1: Name + Type */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <TextField
              label="Variable Name"
              value={field.name}
              onChange={(e) => updateField(i, { name: e.target.value.replace(/\s/g, '') })}
              size="small"
              placeholder="e.g. businessName"
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Type"
              value={field.type}
              onChange={(e) => updateField(i, { type: e.target.value as SchemaField['type'] })}
              size="small"
              sx={{ width: 120 }}
            >
              <MenuItem value="string">String</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
              <MenuItem value="select">Select</MenuItem>
            </TextField>
          </Box>
          {/* Row 2: Default + Required + Delete */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Default"
              value={field.defaultValue ?? ''}
              onChange={(e) => updateField(i, { defaultValue: e.target.value })}
              size="small"
              sx={{ flex: 1 }}
            />
            <FormControlLabel
              control={<Checkbox checked={field.required ?? false} onChange={(e) => updateField(i, { required: e.target.checked })} size="small" />}
              label={<Typography variant="caption">Required</Typography>}
            />
            <IconButton size="small" onClick={() => removeField(i)} color="error"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
