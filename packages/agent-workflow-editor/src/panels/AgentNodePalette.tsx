import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getNodeTypesByCategory, agentNodeTypes } from '../store/node-registry';
import type { AgentNodeTypeDefinition } from '../store/types';

interface AgentNodePaletteProps {
  onAddNode: (nodeType: AgentNodeTypeDefinition) => void;
}

export function AgentNodePalette({ onAddNode }: AgentNodePaletteProps) {
  const [search, setSearch] = useState('');
  const grouped = getNodeTypesByCategory();

  const filteredGroups = search
    ? Object.fromEntries(
        Object.entries(grouped).map(([cat, nodes]) => [
          cat,
          nodes.filter(n =>
            n.label.toLowerCase().includes(search.toLowerCase()) ||
            n.description.toLowerCase().includes(search.toLowerCase())
          ),
        ]).filter(([, nodes]) => (nodes as AgentNodeTypeDefinition[]).length > 0)
      )
    : grouped;

  return (
    <Box sx={{ width: 240, borderRight: 1, borderColor: 'divider', bgcolor: 'grey.50', overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Add Node</Typography>
        <TextField
          size="small"
          placeholder="Search nodes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment>,
          }}
          sx={{ mb: 1 }}
        />
      </Box>

      {Object.entries(filteredGroups).map(([category, nodes]) => (
        <Box key={category} sx={{ mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ px: 1.5, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {category}
          </Typography>
          {(nodes as AgentNodeTypeDefinition[]).map(node => (
            <Box
              key={node.slug}
              onClick={() => onAddNode(node)}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/agent-node', JSON.stringify(node));
                e.dataTransfer.effectAllowed = 'move';
              }}
              sx={{
                mx: 1, mb: 0.5, p: 1, borderRadius: 1, cursor: 'grab',
                border: 1, borderColor: 'transparent',
                display: 'flex', alignItems: 'center', gap: 1,
                '&:hover': { bgcolor: 'white', borderColor: 'divider', boxShadow: 1 },
                transition: 'all 0.15s',
              }}
            >
              <Box sx={{
                width: 28, height: 28, borderRadius: 1, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
                bgcolor: `${node.color}15`, flexShrink: 0,
              }}>
                {node.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12, lineHeight: 1.2 }}>
                  {node.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block', lineHeight: 1.2 }}>
                  {node.description.slice(0, 50)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
