import React from 'react';
import { Box, Typography, TextField, Select, MenuItem, FormControlLabel, Switch, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getNodeType } from '../store/node-registry';
import type { AgentNodeData } from '../store/types';

interface AgentNodeInspectorProps {
  nodeId: string;
  data: AgentNodeData;
  onUpdate: (data: Partial<AgentNodeData>) => void;
  onDelete: () => void;
}

export function AgentNodeInspector({ nodeId, data, onUpdate, onDelete }: AgentNodeInspectorProps) {
  const nodeDef = getNodeType(data.nodeSlug);

  if (!nodeDef) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Unknown node type: {data.nodeSlug}</Typography>
      </Box>
    );
  }

  const handleConfigChange = (field: string, value: unknown) => {
    onUpdate({ config: { ...data.config, [field]: value } });
  };

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
        />
      </Box>

      {/* Config fields */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
          Configuration
        </Typography>

        {nodeDef.configFields.map(field => (
          <Box key={field.name}>
            {field.type === 'text' && (
              <TextField
                label={field.label}
                value={(data.config[field.name] as string) ?? field.defaultValue ?? ''}
                onChange={e => handleConfigChange(field.name, e.target.value)}
                size="small"
                fullWidth
                helperText={field.helperText}
              />
            )}

            {field.type === 'textarea' && (
              <TextField
                label={field.label}
                value={(data.config[field.name] as string) ?? field.defaultValue ?? ''}
                onChange={e => handleConfigChange(field.name, e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={3}
                helperText={field.helperText}
              />
            )}

            {field.type === 'number' && (
              <TextField
                label={field.label}
                type="number"
                value={(data.config[field.name] as number) ?? field.defaultValue ?? 0}
                onChange={e => handleConfigChange(field.name, parseFloat(e.target.value))}
                size="small"
                fullWidth
                helperText={field.helperText}
              />
            )}

            {field.type === 'select' && (
              <TextField
                label={field.label}
                select
                value={(data.config[field.name] as string) ?? field.defaultValue ?? ''}
                onChange={e => handleConfigChange(field.name, e.target.value)}
                size="small"
                fullWidth
                helperText={field.helperText}
              >
                {field.options?.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            )}

            {field.type === 'boolean' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(data.config[field.name] ?? field.defaultValue)}
                    onChange={e => handleConfigChange(field.name, e.target.checked)}
                    size="small"
                  />
                }
                label={field.label}
              />
            )}

            {field.type === 'json' && (
              <TextField
                label={field.label}
                value={typeof data.config[field.name] === 'string'
                  ? data.config[field.name] as string
                  : JSON.stringify(data.config[field.name] ?? field.defaultValue ?? {}, null, 2)}
                onChange={e => {
                  try { handleConfigChange(field.name, JSON.parse(e.target.value)); }
                  catch { handleConfigChange(field.name, e.target.value); }
                }}
                size="small"
                fullWidth
                multiline
                rows={3}
                helperText={field.helperText}
                sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
              />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
