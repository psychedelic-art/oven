import React from 'react';
import { Autocomplete, TextField, Chip, Box, Typography } from '@mui/material';
import type { ContextVariable } from '../utils/agent-context-flow';
import { groupVariablesBySource } from '../utils/agent-context-flow';

// ─── Type Colors ────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

// ─── Props ──────────────────────────────────────────────────

interface AgentVariablePickerProps {
  value: string;
  onChange: (value: string) => void;
  availableVariables: ContextVariable[];
  label?: string;
  placeholder?: string;
  expectedType?: string;
  required?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
}

// ─── Component ──────────────────────────────────────────────

export function AgentVariablePicker({
  value,
  onChange,
  availableVariables,
  label,
  placeholder,
  expectedType,
  required,
  helperText,
  size = 'small',
}: AgentVariablePickerProps) {
  // Build options grouped by source
  const options = availableVariables.map(v => ({
    path: v.path,
    label: v.name,
    type: v.type,
    group: v.source,
  }));

  const currentOption = options.find(o => o.path === value) ?? null;

  return (
    <Autocomplete
      freeSolo
      value={currentOption ?? value ?? ''}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue && typeof newValue === 'object' && 'path' in newValue) {
          onChange(newValue.path);
        }
      }}
      onInputChange={(_, inputValue, reason) => {
        if (reason === 'input') onChange(inputValue);
      }}
      options={options}
      groupBy={(option) => typeof option === 'string' ? '' : option.group}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.path}
      isOptionEqualToValue={(option, val) => {
        if (typeof option === 'string' || typeof val === 'string') return option === val;
        return option.path === val.path;
      }}
      renderOption={(props, option) => {
        if (typeof option === 'string') return <li {...props}>{option}</li>;
        const color = TYPE_COLORS[option.type] ?? '#9e9e9e';
        return (
          <li {...props}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Chip label={option.type} size="small" sx={{ bgcolor: `${color}20`, color, fontSize: 10, height: 18, fontWeight: 600 }} />
              <Typography variant="body2" sx={{ flex: 1, fontSize: 12 }}>{option.label}</Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: 10 }}>{option.path}</Typography>
            </Box>
          </li>
        );
      }}
      renderGroup={(params) => (
        <li key={params.key}>
          <Box sx={{ px: 1.5, py: 0.5, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: 9, letterSpacing: 1 }}>
              {params.group}
            </Typography>
          </Box>
          <ul style={{ padding: 0 }}>{params.children}</ul>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {label}
              {expectedType && (
                <Chip label={expectedType} size="small" sx={{ bgcolor: `${TYPE_COLORS[expectedType] ?? '#9e9e9e'}20`, color: TYPE_COLORS[expectedType] ?? '#9e9e9e', fontSize: 9, height: 16 }} />
              )}
            </Box>
          }
          placeholder={placeholder ?? `$.path or literal value`}
          helperText={helperText}
          required={required}
          size={size}
          InputProps={{
            ...params.InputProps,
            sx: { fontFamily: value?.startsWith('$.') ? 'monospace' : 'inherit', fontSize: 13 },
          }}
        />
      )}
      size={size}
      sx={{ minWidth: 200 }}
    />
  );
}
