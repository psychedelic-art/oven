import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import MergeTypeIcon from '@mui/icons-material/MergeType';

export interface LogicGateNodeData {
  label?: string;
  gateType?: 'AND' | 'OR';
}

export const LogicGateNode = memo(({ data, selected }: NodeProps) => {
  const d = data as LogicGateNodeData;
  const gateType = d.gateType ?? 'AND';
  const color = gateType === 'AND' ? '#5c6bc0' : '#7e57c2';

  return (
    <Box
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : color,
        borderRadius: '50%',
        bgcolor: 'background.paper',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? 3 : 1,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} id="input-1" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="input-2" style={{ left: '70%' }} />
      <Box sx={{ textAlign: 'center' }}>
        <MergeTypeIcon sx={{ color, fontSize: 18 }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color, lineHeight: 1 }}
        >
          {gateType}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
});

LogicGateNode.displayName = 'LogicGateNode';
