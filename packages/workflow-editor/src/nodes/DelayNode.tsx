import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';

export function DelayNode({ data, selected }: NodeProps) {
  const d = data as any;
  const ms = d?.ms ?? 1000;

  return (
    <Box
      sx={{
        bgcolor: '#eceff1',
        border: '2px solid',
        borderColor: selected ? '#37474f' : '#78909c',
        borderRadius: 2,
        p: 1.5,
        minWidth: 120,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <TimerIcon sx={{ fontSize: 16, color: '#37474f' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#37474f' }}>
          Delay
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
        {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
      </Typography>

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
