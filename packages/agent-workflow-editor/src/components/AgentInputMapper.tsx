import React, { useState } from 'react';
import { Box, Typography, Chip, Collapse, Button, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AgentVariablePicker } from './AgentVariablePicker';
import { getNodeType } from '../store/node-registry';
import type { ContextVariable } from '../utils/agent-context-flow';
import type { AgentNodeTypeDefinition } from '../store/types';

// ─── Props ──────────────────────────────────────────────────

interface AgentInputMapperProps {
  nodeSlug: string;
  config: Record<string, unknown>;
  availableVariables: ContextVariable[];
  producedVariables: ContextVariable[];
  onChange: (config: Record<string, unknown>) => void;
}

// ─── Type Colors ────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

// ─── Component ──────────────────────────────────────────────

export function AgentInputMapper({ nodeSlug, config, availableVariables, producedVariables, onChange }: AgentInputMapperProps) {
  const nodeDef = getNodeType(nodeSlug);
  const [showOptional, setShowOptional] = useState(false);

  if (!nodeDef) return null;

  // Separate required (fields that typically need a value) from optional
  const requiredFields = nodeDef.configFields.filter(f =>
    ['messages', 'query', 'field', 'template', 'agentSlug', 'mode', 'content'].includes(f.name)
  );
  const optionalFields = nodeDef.configFields.filter(f => !requiredFields.includes(f));

  const updateConfig = (field: string, value: unknown) => {
    const newConfig = { ...config };
    if (value === '' || value === undefined || value === null) {
      delete newConfig[field];
    } else {
      newConfig[field] = value;
    }
    onChange(newConfig);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Inputs Header */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
        Inputs
      </Typography>

      {/* Required Fields */}
      {requiredFields.map(field => (
        <InputField
          key={field.name}
          field={field}
          value={config[field.name]}
          availableVariables={availableVariables}
          onChange={(val) => updateConfig(field.name, val)}
        />
      ))}

      {/* Optional Fields */}
      {optionalFields.length > 0 && (
        <>
          <Button
            size="small"
            onClick={() => setShowOptional(!showOptional)}
            endIcon={showOptional ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ alignSelf: 'flex-start', fontSize: 11, textTransform: 'none', color: 'text.secondary' }}
          >
            {showOptional ? 'Hide' : 'Show'} optional ({optionalFields.length})
          </Button>
          <Collapse in={showOptional}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1, borderLeft: 2, borderColor: 'grey.200' }}>
              {optionalFields.map(field => (
                <InputField
                  key={field.name}
                  field={field}
                  value={config[field.name]}
                  availableVariables={availableVariables}
                  onChange={(val) => updateConfig(field.name, val)}
                />
              ))}
            </Box>
          </Collapse>
        </>
      )}

      {/* Outputs Section */}
      {producedVariables.length > 0 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
            Outputs (available to downstream nodes)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {producedVariables.map(v => (
              <Chip
                key={v.path}
                label={`${v.name}: ${v.type}`}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  height: 22,
                  bgcolor: `${TYPE_COLORS[v.type] ?? '#9e9e9e'}10`,
                  color: TYPE_COLORS[v.type] ?? '#9e9e9e',
                  border: 1,
                  borderColor: `${TYPE_COLORS[v.type] ?? '#9e9e9e'}30`,
                }}
                title={v.path}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Individual Input Field ─────────────────────────────────

function InputField({ field, value, availableVariables, onChange }: {
  field: AgentNodeTypeDefinition['configFields'][0];
  value: unknown;
  availableVariables: ContextVariable[];
  onChange: (value: unknown) => void;
}) {
  // Determine expected type based on field type
  const expectedType = field.type === 'number' ? 'number'
    : field.type === 'boolean' ? 'boolean'
    : field.type === 'json' ? 'object'
    : field.type === 'textarea' ? 'string'
    : 'string';

  // For select fields, use the regular select rendering
  if (field.type === 'select' && field.options) {
    return (
      <AgentVariablePicker
        value={String(value ?? field.defaultValue ?? '')}
        onChange={(v) => onChange(v)}
        availableVariables={availableVariables}
        label={field.label}
        expectedType={expectedType}
        helperText={field.helperText}
      />
    );
  }

  return (
    <AgentVariablePicker
      value={String(value ?? '')}
      onChange={(v) => onChange(v)}
      availableVariables={availableVariables}
      label={field.label}
      expectedType={expectedType}
      placeholder={field.helperText ?? `$.path or literal ${expectedType}`}
      helperText={field.helperText}
    />
  );
}
