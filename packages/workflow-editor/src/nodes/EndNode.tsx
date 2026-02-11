import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import StopCircleIcon from '@mui/icons-material/StopCircle';

export function EndNode({ data, selected }: NodeProps) {
  return (
    <Box
      sx={{
        bgcolor: '#ffebee',
        border: '2px solid',
        borderColor: selected ? '#b71c1c' : '#ef5350',
        borderRadius: '50%',
        p: 1.5,
        width: 80,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <StopCircleIcon sx={{ fontSize: 20, color: '#b71c1c' }} />
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#b71c1c' }}>
        End
      </Typography>
    </Box>
  );
}
