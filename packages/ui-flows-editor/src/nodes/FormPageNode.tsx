import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

/**
 * Form page node — renders a referenced form.
 */
export function FormPageNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#fff3e0',
        border: '2px solid',
        borderColor: selected ? '#e65100' : '#ff9800',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <DescriptionIcon sx={{ fontSize: 18, color: '#e65100' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#e65100' }}>
          Form
        </Typography>
      </Box>
      {d?.title && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {d.title}
        </Typography>
      )}
      {d?.slug && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', display: 'block' }}>
          /{d.slug}
        </Typography>
      )}
      {d?.formRef && (
        <Chip
          label={`Form: ${d.formRef}`}
          size="small"
          sx={{ mt: 0.5, height: 18, fontSize: 9, bgcolor: '#ff980020' }}
        />
      )}
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
