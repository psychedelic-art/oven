import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import RepeatIcon from '@mui/icons-material/Repeat';

export function WhileLoopNode({ data, selected }: NodeProps) {
  const d = data as any;
  const key = d?.key ?? '';
  const operator = d?.operator ?? '==';
  const value = d?.value ?? '';

  const conditionLabel = key ? `${key} ${operator} ${value}` : 'No condition set';

  return (
    <Box
      sx={{
        bgcolor: '#ede7f6',
        border: '2px solid',
        borderColor: selected ? '#311b92' : '#4527a0',
        borderRadius: 2,
        p: 1.5,
        minWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <RepeatIcon sx={{ fontSize: 16, color: '#4527a0' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4527a0' }}>
          {d?.label ?? 'While Loop'}
        </Typography>
      </Box>

      <Box sx={{ mt: 0.5, bgcolor: 'rgba(69,39,160,0.08)', borderRadius: 1, px: 1, py: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', fontSize: 9, display: 'block' }}
        >
          while ({conditionLabel})
        </Typography>
      </Box>

      {d?.maxIterations && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, mt: 0.5, display: 'block' }}>
          max: {d.maxIterations} iterations
          {d?.timeoutMs ? ` / ${d.timeoutMs}ms timeout` : ''}
        </Typography>
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
