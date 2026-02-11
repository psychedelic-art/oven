import React, { useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import type { ContextVariable } from '@oven/module-workflows/types';
import { groupVariablesBySource } from '../utils/context-flow';

interface VariablePickerProps {
  /** Current value ($.path expression or literal) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Available variables from context flow */
  availableVariables: ContextVariable[];
  /** Label for the field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Expected type hint */
  expectedType?: string;
  /** Whether this is a required field */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Size variant */
  size?: 'small' | 'medium';
}

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

/**
 * Autocomplete field for picking $.path variable references.
 * Groups options by source (Trigger Payload, Get Player, etc.)
 * and allows free-text entry for literal values.
 */
export function VariablePicker({
  value,
  onChange,
  availableVariables,
  label = 'Value',
  placeholder = '$.path or literal',
  expectedType,
  required = false,
  helperText,
  size = 'small',
}: VariablePickerProps) {
  // Build grouped options
  const grouped = useMemo(() => {
    return groupVariablesBySource(availableVariables);
  }, [availableVariables]);

  // Flatten for Autocomplete options
  const options = useMemo(() => {
    const opts: { path: string; label: string; type: string; group: string }[] = [];
    for (const group of grouped) {
      for (const v of group.variables) {
        opts.push({
          path: v.path,
          label: v.name,
          type: v.type,
          group: group.source,
        });
      }
    }
    return opts;
  }, [grouped]);

  return (
    <Autocomplete
      freeSolo
      size={size}
      value={value || ''}
      onChange={(_event: any, newValue: any) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue?.path) {
          onChange(newValue.path);
        }
      }}
      onInputChange={(_event: any, newInputValue: string) => {
        onChange(newInputValue);
      }}
      options={options}
      groupBy={(option) => typeof option === 'string' ? '' : option.group}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return option.path;
      }}
      renderOption={(props, option) => {
        if (typeof option === 'string') return null;
        return (
          <Box
            component="li"
            {...props}
            key={option.path}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}
          >
            <Chip
              label={option.type}
              size="small"
              sx={{
                height: 18,
                fontSize: 9,
                bgcolor: TYPE_COLORS[option.type] ?? '#757575',
                color: '#fff',
                fontWeight: 600,
              }}
            />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                {option.label}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary' }}>
                {option.path}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderGroup={(params) => (
        <Box key={params.key}>
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              py: 0.5,
              display: 'block',
              fontWeight: 700,
              color: 'text.secondary',
              bgcolor: 'action.hover',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {params.group}
          </Typography>
          {params.children}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {label}
              {required && <Typography component="span" color="error" sx={{ fontSize: 12 }}>*</Typography>}
              {expectedType && (
                <Chip
                  label={expectedType}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 8,
                    bgcolor: TYPE_COLORS[expectedType] ?? '#757575',
                    color: '#fff',
                    ml: 0.5,
                  }}
                />
              )}
            </Box>
          }
          placeholder={placeholder}
          helperText={helperText}
          sx={{
            '& input': { fontFamily: 'monospace', fontSize: 12 },
          }}
        />
      )}
      sx={{ mb: 1.5 }}
    />
  );
}
