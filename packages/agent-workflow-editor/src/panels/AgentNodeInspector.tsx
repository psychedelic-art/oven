import React from 'react';
import { Box, Typography, TextField, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getNodeType } from '../store/node-registry';
import { AgentInputMapper } from '../components/AgentInputMapper';
import type { AgentNodeData } from '../store/types';
import type { ContextVariable } from '../utils/agent-context-flow';

interface AgentNodeInspectorProps {
  nodeId: string;
  data: AgentNodeData;
  onUpdate: (data: Partial<AgentNodeData>) => void;
  onDelete: () => void;
  availableVariables?: ContextVariable[];
  producedVariables?: ContextVariable[];
}

export function AgentNodeInspector({ nodeId, data, onUpdate, onDelete, availableVariables = [], producedVariables = [] }: AgentNodeInspectorProps) {
  const nodeDef = getNodeType(data.nodeSlug);

  if (!nodeDef) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Unknown node type: {data.nodeSlug}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', bgcolor: 'white', overflow: 'auto', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 20,
          bgcolor: `${data.color}15`,
        }}>
          {data.icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{nodeDef.label}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{nodeDef.category}</Typography>
        </Box>
        <IconButton size="small" color="error" onClick={onDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Label field */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          label="Node Label"
          value={data.label}
          onChange={e => onUpdate({ label: e.target.value })}
          size="small"
          fullWidth
          helperText="Unique identifier for this node (used in $.path references)"
        />
      </Box>

      {/* Input Mapper with Variable Picker */}
      <Box sx={{ p: 2 }}>
        <AgentInputMapper
          nodeSlug={data.nodeSlug}
          config={data.config}
          availableVariables={availableVariables}
          producedVariables={producedVariables}
          onChange={(config) => onUpdate({ config })}
        />
      </Box>
    </Box>
  );
}
