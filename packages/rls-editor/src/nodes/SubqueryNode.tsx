import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SubqueryNodeData {
  label?: string;
  table?: string;
  joinColumn?: string;
  condition?: string;
}

export const SubqueryNode = memo(({ data, selected }: NodeProps) => {
  const d = data as SubqueryNodeData;

  const summary = d.table
    ? `EXISTS (${d.table}.${d.joinColumn ?? 'id'})`
    : 'Configure...';

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : '#00838f',
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 200,
        boxShadow: selected ? 3 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} id="input" />
      <Box
        sx={{
          bgcolor: '#00838f',
          color: 'white',
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <SearchIcon fontSize="small" />
        <Typography variant="caption" fontWeight={600}>
          {d.label || 'Subquery'}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {summary}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
});

SubqueryNode.displayName = 'SubqueryNode';
