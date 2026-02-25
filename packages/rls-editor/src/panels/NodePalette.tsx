import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultData: Record<string, unknown>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'table',
    label: 'Table',
    icon: <TableChartIcon fontSize="small" />,
    color: '#26a69a',
    defaultData: { label: 'Table', tableName: '' },
  },
  {
    type: 'context',
    label: 'Context Variable',
    icon: <PersonIcon fontSize="small" />,
    color: '#4caf50',
    defaultData: { label: 'Context', variable: 'current_user_id' },
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: <FilterAltIcon fontSize="small" />,
    color: '#ff9800',
    defaultData: { label: 'Condition', column: '', operator: '=', value: '' },
  },
  {
    type: 'logicGate',
    label: 'AND Gate',
    icon: <MergeTypeIcon fontSize="small" />,
    color: '#5c6bc0',
    defaultData: { label: 'AND', gateType: 'AND' },
  },
  {
    type: 'logicGate',
    label: 'OR Gate',
    icon: <MergeTypeIcon fontSize="small" />,
    color: '#7e57c2',
    defaultData: { label: 'OR', gateType: 'OR' },
  },
  {
    type: 'subquery',
    label: 'Subquery',
    icon: <SearchIcon fontSize="small" />,
    color: '#00838f',
    defaultData: { label: 'Subquery', table: '', joinColumn: '', condition: '' },
  },
  {
    type: 'action',
    label: 'Allow',
    icon: <CheckCircleIcon fontSize="small" />,
    color: '#4caf50',
    defaultData: { label: 'Allow', action: 'ALLOW' },
  },
  {
    type: 'action',
    label: 'Deny',
    icon: <BlockIcon fontSize="small" />,
    color: '#ef5350',
    defaultData: { label: 'Deny', action: 'DENY' },
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData(
      'application/rls-node',
      JSON.stringify({ type: item.type, data: item.defaultData })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box
      sx={{
        width: 200,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          RLS Nodes
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Drag nodes to build your policy
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        {PALETTE_ITEMS.map((item, idx) => (
          <Box
            key={`${item.type}-${idx}`}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              mb: 0.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'grab',
              transition: 'all 0.15s',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: item.color,
              },
              '&:active': {
                cursor: 'grabbing',
              },
            }}
          >
            <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
            <Typography variant="body2" fontSize={12}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
