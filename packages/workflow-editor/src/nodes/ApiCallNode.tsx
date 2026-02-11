import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import HttpIcon from '@mui/icons-material/Http';

export function ApiCallNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#e3f2fd',
        border: '2px solid',
        borderColor: selected ? '#1565c0' : '#42a5f5',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <HttpIcon sx={{ fontSize: 16, color: '#1565c0' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1565c0' }}>
          {d?.label ?? 'API Call'}
        </Typography>
      </Box>

      {d?.nodeTypeId && (
        <Chip
          label={d.nodeTypeId}
          size="small"
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: 10, mb: 0.5 }}
        />
      )}

      {d?.inputMapping && Object.keys(d.inputMapping).length > 0 && (
        <Box sx={{ mt: 0.5 }}>
          {Object.entries(d.inputMapping).slice(0, 3).map(([k, v]) => (
            <Typography key={k} variant="caption" sx={{ fontFamily: 'monospace', fontSize: 9, display: 'block' }}>
              {k}: {String(v)}
            </Typography>
          ))}
        </Box>
      )}

      <Handle type="source" position={Position.Bottom} id="output" style={{ left: '30%' }} />
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        style={{ left: '70%', background: '#ef4444' }}
      />
    </Box>
  );
}
