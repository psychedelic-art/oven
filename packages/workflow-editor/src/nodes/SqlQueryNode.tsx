import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';

export function SqlQueryNode({ data, selected }: NodeProps) {
  const d = data as any;
  const query = d?.query ?? '';
  const truncated = query.length > 60 ? query.slice(0, 57) + '...' : query;

  return (
    <Box
      sx={{
        bgcolor: '#e0f2f1',
        border: '2px solid',
        borderColor: selected ? '#00695c' : '#26a69a',
        borderRadius: 2,
        p: 1.5,
        minWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <StorageIcon sx={{ fontSize: 16, color: '#00695c' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#00695c' }}>
          {d?.label ?? 'SQL Query'}
        </Typography>
      </Box>

      {query && (
        <Box sx={{ mt: 0.5, bgcolor: 'rgba(0,105,92,0.08)', borderRadius: 1, px: 1, py: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontSize: 9, display: 'block', whiteSpace: 'pre-wrap' }}
          >
            {truncated}
          </Typography>
        </Box>
      )}

      {d?.params && Array.isArray(d.params) && d.params.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, mt: 0.5, display: 'block' }}>
          {d.params.length} param{d.params.length > 1 ? 's' : ''}
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
