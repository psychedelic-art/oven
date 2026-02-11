import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { NodeTypeDefinition } from '@oven/module-workflows/types';

interface NodePaletteProps {
  nodeTypes: NodeTypeDefinition[];
}

const categoryColors: Record<string, string> = {
  'api-call': '#1565c0',
  'event-emit': '#880e4f',
  'condition': '#e65100',
  'transform': '#6a1b9a',
  'delay': '#37474f',
  'utility': '#546e7a',
  'loop': '#006064',
  'variable': '#f57f17',
  'data': '#00695c',
};

/**
 * Sidebar palette showing all available workflow nodes grouped by module.
 * Nodes can be dragged onto the canvas to add them to the workflow.
 */
export function NodePalette({ nodeTypes }: NodePaletteProps) {
  const [search, setSearch] = useState('');

  // Group by module
  const grouped: Record<string, NodeTypeDefinition[]> = {};
  for (const node of nodeTypes) {
    if (search && !node.label.toLowerCase().includes(search.toLowerCase()) &&
        !node.id.toLowerCase().includes(search.toLowerCase())) {
      continue;
    }
    if (!grouped[node.module]) grouped[node.module] = [];
    grouped[node.module].push(node);
  }

  const onDragStart = (event: React.DragEvent, nodeType: NodeTypeDefinition) => {
    event.dataTransfer.setData('application/workflow-node', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box
      sx={{
        width: 260,
        borderRight: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" gutterBottom>
          Node Palette
        </Typography>
        <TextField
          size="small"
          placeholder="Search nodes..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
        />
      </Box>

      {/* Built-in utility nodes */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Quick Add
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {[
            { type: 'trigger', label: 'Trigger', color: '#4caf50' },
            { type: 'condition', label: 'Condition', color: '#ff9800' },
            { type: 'delay', label: 'Delay', color: '#78909c' },
            { type: 'end', label: 'End', color: '#ef5350' },
          ].map((item) => (
            <Chip
              key={item.type}
              label={item.label}
              size="small"
              draggable
              onDragStart={(e: any) =>
                onDragStart(e, {
                  id: `core.${item.type}`,
                  label: item.label,
                  module: 'core',
                  category: item.type as any,
                  description: '',
                  inputs: [],
                  outputs: [],
                })
              }
              sx={{
                cursor: 'grab',
                bgcolor: item.color + '20',
                borderColor: item.color,
                border: '1px solid',
                '&:active': { cursor: 'grabbing' },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Module groups */}
      {Object.entries(grouped)
        .sort(([a], [b]) => (a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b)))
        .map(([module, nodes]) => (
          <Accordion key={module} defaultExpanded={module === 'core'} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {module}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  ({nodes.length})
                </Typography>
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0.5 }}>
              {nodes.map((node) => (
                <Box
                  key={node.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  sx={{
                    p: 1,
                    mx: 0.5,
                    mb: 0.5,
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    border: '1px solid transparent',
                    cursor: 'grab',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'primary.50' },
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: categoryColors[node.category] ?? '#546e7a',
                      }}
                    />
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      {node.label}
                    </Typography>
                  </Box>
                  {node.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 10, display: 'block', mt: 0.25 }}
                    >
                      {node.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
    </Box>
  );
}
