import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#fff3e0',
        border: '2px solid',
        borderColor: selected ? '#e65100' : '#ff9800',
        borderRadius: 2,
        p: 1.5,
        minWidth: 160,
        textAlign: 'center',
        // Diamond-like shape hint
        transform: 'rotate(0deg)',
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <CallSplitIcon sx={{ fontSize: 16, color: '#e65100' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#e65100' }}>
          Condition
        </Typography>
      </Box>

      {d?.key && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
          {d.key} {d.operator ?? '=='} {String(d.value ?? '')}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, px: 1 }}>
        <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, fontSize: 10 }}>
          TRUE
        </Typography>
        <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600, fontSize: 10 }}>
          FALSE
        </Typography>
      </Box>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%', background: '#4caf50' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%', background: '#ef4444' }}
      />
    </Box>
  );
}
