import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import WebIcon from '@mui/icons-material/Web';

/**
 * Landing page node — hero section with CTA buttons.
 */
export function LandingPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#e3f2fd',
        border: '2px solid',
        borderColor: selected ? '#1565c0' : '#2196f3',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <WebIcon sx={{ fontSize: 18, color: '#1565c0' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1565c0' }}>
          Landing
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
