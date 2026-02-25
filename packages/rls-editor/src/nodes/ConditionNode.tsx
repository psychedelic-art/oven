import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

export interface ConditionNodeData {
  label?: string;
  column?: string;
  operator?: string;
  value?: string;
  valueRef?: string;
}

const OPERATOR_LABELS: Record<string, string> = {
  '=': '=',
  '!=': '!=',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
  'IN': 'IN',
  'NOT IN': 'NOT IN',
  'IS NULL': 'IS NULL',
  'IS NOT NULL': 'IS NOT NULL',
  'LIKE': 'LIKE',
  'ILIKE': 'ILIKE',
};

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as ConditionNodeData;
  const op = d.operator ?? '=';

  const summary = d.column
    ? `${d.column} ${op} ${d.valueRef ? '(ref)' : d.value ?? '?'}`
    : 'Configure...';

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : '#ff9800',
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 180,
        boxShadow: selected ? 3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box
        sx={{
          bgcolor: '#ff9800',
          color: 'white',
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <FilterAltIcon fontSize="small" />
        <Typography variant="caption" fontWeight={600}>
          {d.label || 'Condition'}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {summary}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
});

ConditionNode.displayName = 'ConditionNode';
