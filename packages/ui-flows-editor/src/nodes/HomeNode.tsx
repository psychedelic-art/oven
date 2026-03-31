import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';

/**
 * Portal entry point node — represents the root/home of the portal.
 */
export function HomeNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#e8f5e9',
        border: '2px solid',
        borderColor: selected ? '#2e7d32' : '#4caf50',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <HomeIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
          Portal Home
        </Typography>
      </Box>
      {d?.title && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {d.title}
        </Typography>
      )}
      {d?.slug && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary' }}>
          /{d.slug}
        </Typography>
      )}
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
