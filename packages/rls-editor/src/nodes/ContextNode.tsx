import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export interface ContextNodeData {
  label?: string;
  variable?: string;
}

const VARIABLE_LABELS: Record<string, string> = {
  current_user_id: 'Current User ID',
  current_role: 'Current Role',
  current_hierarchy_path: 'Hierarchy Path',
};

export const ContextNode = memo(({ data, selected }: NodeProps) => {
  const d = data as ContextNodeData;
  const variable = d.variable ?? 'current_user_id';
  const displayLabel = VARIABLE_LABELS[variable] ?? variable;

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : '#4caf50',
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 160,
        boxShadow: selected ? 3 : 1,
      }}
    >
      <Box
        sx={{
          bgcolor: '#4caf50',
          color: 'white',
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <PersonIcon fontSize="small" />
        <Typography variant="caption" fontWeight={600}>
          {d.label || 'Context'}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          $.{variable}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {displayLabel}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
});

ContextNode.displayName = 'ContextNode';
