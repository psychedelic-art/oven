import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';

export function SetVariableNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <Box
      sx={{
        bgcolor: '#fff8e1',
        border: '2px solid',
        borderColor: selected ? '#f57f17' : '#ffb300',
        borderRadius: 2,
        p: 1.5,
        minWidth: 170,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <EditNoteIcon sx={{ fontSize: 16, color: '#f57f17' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57f17' }}>
          {d?.label ?? 'Set Variable'}
        </Typography>
      </Box>

      {d?.variableName && (
        <Box sx={{ mt: 0.5, bgcolor: 'rgba(255,179,0,0.1)', borderRadius: 1, px: 1, py: 0.5 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, display: 'block' }}>
            <strong>{d.variableName}</strong> = {String(d.variableValue ?? '?')}
          </Typography>
        </Box>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
