import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';

/**
 * Custom page node — generic page with custom content.
 */
export function CustomPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#eceff1',
        border: '2px solid',
        borderColor: selected ? '#37474f' : '#607d8b',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <CodeIcon sx={{ fontSize: 18, color: '#37474f' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#37474f' }}>
          Custom
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
