import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';

export interface ActionNodeData {
  label?: string;
  action?: 'ALLOW' | 'DENY';
}

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as ActionNodeData;
  const action = d.action ?? 'ALLOW';
  const isAllow = action === 'ALLOW';
  const color = isAllow ? '#4caf50' : '#ef5350';
  const Icon = isAllow ? CheckCircleIcon : BlockIcon;

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : color,
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 140,
        boxShadow: selected ? 3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box
        sx={{
          bgcolor: color,
          color: 'white',
          px: 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          borderRadius: '6px 6px 6px 6px',
        }}
      >
        <Icon fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          {action}
        </Typography>
      </Box>
    </Box>
  );
});

ActionNode.displayName = 'ActionNode';
