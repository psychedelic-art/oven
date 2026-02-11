import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import TransformIcon from '@mui/icons-material/Transform';

export function TransformNode({ data, selected }: NodeProps) {
  const d = data as any;
  const mapping = d?.mapping ?? {};
  const keys = Object.keys(mapping);

  return (
    <Box
      sx={{
        bgcolor: '#f3e5f5',
        border: '2px solid',
        borderColor: selected ? '#6a1b9a' : '#ab47bc',
        borderRadius: 2,
        p: 1.5,
        minWidth: 160,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <TransformIcon sx={{ fontSize: 16, color: '#6a1b9a' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6a1b9a' }}>
          Transform
        </Typography>
      </Box>

      {keys.length > 0 && (
        <Box>
          {keys.slice(0, 4).map((k) => (
            <Typography key={k} variant="caption" sx={{ fontFamily: 'monospace', fontSize: 9, display: 'block' }}>
              {k} &larr; {String(mapping[k])}
            </Typography>
          ))}
          {keys.length > 4 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
              +{keys.length - 4} more
            </Typography>
          )}
        </Box>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
