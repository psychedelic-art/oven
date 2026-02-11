import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export function EventEmitNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#fce4ec',
        border: '2px solid',
        borderColor: selected ? '#880e4f' : '#e91e63',
        borderRadius: 2,
        p: 1.5,
        minWidth: 160,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <SendIcon sx={{ fontSize: 16, color: '#880e4f' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#880e4f' }}>
          Emit Event
        </Typography>
      </Box>

      {d?.eventName && (
        <Chip
          label={d.eventName}
          size="small"
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: 10 }}
        />
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
