import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip } from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import type { PayloadProperty } from '@oven/module-workflows/types';

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

export function TriggerNode({ data, selected }: NodeProps) {
  const d = data as any;
  const schema = (d?.payloadSchema ?? []) as PayloadProperty[];

  return (
    <Box
      sx={{
        bgcolor: '#e8f5e9',
        border: '2px solid',
        borderColor: selected ? '#2e7d32' : '#4caf50',
        borderRadius: 2,
        p: 1.5,
        minWidth: 180,
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <PlayCircleIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
          Trigger
        </Typography>
      </Box>

      {d?.triggerEvent && (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
          {d.triggerEvent}
        </Typography>
      )}

      {/* Show payload schema properties */}
      {schema.length > 0 && (
        <Box sx={{ mt: 0.5, textAlign: 'left' }}>
          {schema.map((prop) => (
            <Box
              key={prop.name}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mb: 0.25,
              }}
            >
              <Chip
                label={prop.type}
                size="small"
                sx={{
                  height: 14,
                  fontSize: 8,
                  bgcolor: TYPE_COLORS[prop.type] ?? '#757575',
                  color: '#fff',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  fontWeight: prop.required ? 600 : 400,
                  color: prop.required ? 'text.primary' : 'text.secondary',
                }}
              >
                {prop.name}{prop.required ? '*' : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </Box>
  );
}
