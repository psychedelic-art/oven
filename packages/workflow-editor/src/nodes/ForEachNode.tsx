import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import LoopIcon from '@mui/icons-material/Loop';

export function ForEachNode({ data, selected }: NodeProps) {
  const d = data as any;
  const collection = d?.collection ?? '';
  const itemVar = d?.itemVariable ?? 'item';
  const batchSize = d?.parallelBatchSize ?? 0;

  return (
    <Box
      sx={{
        bgcolor: '#e0f7fa',
        border: '2px solid',
        borderColor: selected ? '#004d40' : '#006064',
        borderRadius: 2,
        p: 1.5,
        minWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <LoopIcon sx={{ fontSize: 16, color: '#006064' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#006064' }}>
          {d?.label ?? 'ForEach'}
        </Typography>
        {batchSize > 0 && (
          <Chip
            label={`×${batchSize}`}
            size="small"
            sx={{ height: 16, fontSize: 9, bgcolor: '#006064', color: 'white' }}
          />
        )}
      </Box>

      {collection && (
        <Box sx={{ mt: 0.5, bgcolor: 'rgba(0,96,100,0.08)', borderRadius: 1, px: 1, py: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontSize: 9, display: 'block' }}
          >
            {collection} → {itemVar}
          </Typography>
        </Box>
      )}

      {d?.maxIterations && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, mt: 0.5, display: 'block' }}>
          max: {d.maxIterations} iterations
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
