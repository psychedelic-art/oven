import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';

export interface TableNodeData {
  label?: string;
  tableName?: string;
  availableTables?: string[];
}

export const TableNode = memo(({ data, selected }: NodeProps) => {
  const d = data as TableNodeData;

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : '#26a69a',
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 180,
        boxShadow: selected ? 3 : 1,
      }}
    >
      <Box
        sx={{
          bgcolor: '#26a69a',
          color: 'white',
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          borderRadius: '6px 6px 0 0',
        }}
      >
        <TableChartIcon fontSize="small" />
        <Typography variant="caption" fontWeight={600}>
          {d.label || 'Table'}
        </Typography>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {d.tableName || 'Select table...'}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
});

TableNode.displayName = 'TableNode';
