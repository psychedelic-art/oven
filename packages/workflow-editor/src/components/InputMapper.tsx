import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { VariablePicker } from './VariablePicker';
import type {
  NodeTypeDefinition,
  NodeParamDefinition,
  ContextVariable,
} from '@oven/module-workflows/types';

interface InputMapperProps {
  /** The selected node type from registry (has inputs/outputs definitions) */
  nodeTypeDef: NodeTypeDefinition | null;
  /** Current input mapping object */
  inputMapping: Record<string, unknown>;
  /** Available variables from upstream context */
  availableVariables: ContextVariable[];
  /** Callback when mapping changes */
  onChange: (mapping: Record<string, unknown>) => void;
}

/**
 * Visual input mapper that replaces raw JSON editing.
 * Shows each input parameter as a labeled row with a VariablePicker.
 * Groups into required and optional sections.
 */
export function InputMapper({
  nodeTypeDef,
  inputMapping,
  availableVariables,
  onChange,
}: InputMapperProps) {
  const [showOptional, setShowOptional] = useState(false);

  const { required, optional } = useMemo(() => {
    if (!nodeTypeDef) return { required: [], optional: [] };
    const req = nodeTypeDef.inputs.filter((i) => i.required);
    const opt = nodeTypeDef.inputs.filter((i) => !i.required);
    return { required: req, optional: opt };
  }, [nodeTypeDef]);

  const updateMapping = (key: string, value: string) => {
    const newMapping = { ...inputMapping, [key]: value };
    // Remove empty values
    if (!value) delete newMapping[key];
    onChange(newMapping);
  };

  if (!nodeTypeDef) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Select a node type to configure inputs
      </Typography>
    );
  }

  if (nodeTypeDef.inputs.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        This node has no input parameters
      </Typography>
    );
  }

  return (
    <Box>
      {/* Required inputs */}
      {required.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase', mb: 0.5, display: 'block' }}
          >
            Required Inputs
          </Typography>
          {required.map((param) => (
            <InputRow
              key={param.name}
              param={param}
              value={String(inputMapping[param.name] ?? '')}
              availableVariables={availableVariables}
              onChange={(val) => updateMapping(param.name, val)}
            />
          ))}
        </Box>
      )}

      {/* Optional inputs */}
      {optional.length > 0 && (
        <Box>
          <Button
            size="small"
            startIcon={showOptional ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowOptional(!showOptional)}
            sx={{ textTransform: 'none', fontSize: 11, color: 'text.secondary', mb: 0.5 }}
          >
            {showOptional ? 'Hide' : 'Show'} Optional ({optional.length})
          </Button>
          <Collapse in={showOptional}>
            {optional.map((param) => (
              <InputRow
                key={param.name}
                param={param}
                value={String(inputMapping[param.name] ?? '')}
                availableVariables={availableVariables}
                onChange={(val) => updateMapping(param.name, val)}
              />
            ))}
          </Collapse>
        </Box>
      )}

      {/* Node outputs preview */}
      {nodeTypeDef.outputs.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 10, textTransform: 'uppercase', mb: 0.5, display: 'block' }}
          >
            Outputs (produced)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {nodeTypeDef.outputs.map((o) => (
              <Chip
                key={o.name}
                label={`${o.name}: ${o.type}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 22, fontFamily: 'monospace' }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Input Row Component ────────────────────────────────────────

function InputRow({
  param,
  value,
  availableVariables,
  onChange,
}: {
  param: NodeParamDefinition;
  value: string;
  availableVariables: ContextVariable[];
  onChange: (value: string) => void;
}) {
  return (
    <Box sx={{ mb: 0.5 }}>
      <VariablePicker
        value={value}
        onChange={onChange}
        availableVariables={availableVariables}
        label={param.name}
        expectedType={param.type}
        required={param.required}
        placeholder={
          param.example !== undefined
            ? `e.g. ${String(param.example)}`
            : `$.path or literal ${param.type}`
        }
        helperText={param.description}
        size="small"
      />
    </Box>
  );
}
