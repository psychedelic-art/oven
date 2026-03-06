import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * FAQ page node — searchable accordion FAQ list.
 */
export function FaqPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#f3e5f5',
        border: '2px solid',
        borderColor: selected ? '#6a1b9a' : '#9c27b0',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <HelpOutlineIcon sx={{ fontSize: 18, color: '#6a1b9a' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6a1b9a' }}>
          FAQ
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
