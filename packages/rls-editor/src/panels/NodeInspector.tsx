import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Node } from '@xyflow/react';

interface NodeInspectorProps {
  selectedNode: Node;
  onUpdateNode: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
  availableTables?: string[];
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'ILIKE'];
const CONTEXT_VARIABLES = ['current_user_id', 'current_role', 'current_hierarchy_path'];

export function NodeInspector({ selectedNode, onUpdateNode, onClose, availableTables = [] }: NodeInspectorProps) {
  const data = selectedNode.data as Record<string, any>;
  const nodeType = selectedNode.type;

  const updateField = (field: string, value: unknown) => {
    onUpdateNode(selectedNode.id, { ...data, [field]: value });
  };

  return (
    <Box
      sx={{
        width: 280,
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Inspector
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Label (all nodes) */}
        <TextField
          label="Label"
          size="small"
          value={data.label ?? ''}
          onChange={(e) => updateField('label', e.target.value)}
          fullWidth
        />

        {/* Table Node */}
        {nodeType === 'table' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Table</InputLabel>
            <Select
              value={data.tableName ?? ''}
              label="Table"
              onChange={(e) => updateField('tableName', e.target.value)}
            >
              {availableTables.length > 0 ? (
                availableTables.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))
              ) : (
                <MenuItem value="">
                  <em>Type table name below</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>
        )}
        {nodeType === 'table' && availableTables.length === 0 && (
          <TextField
            label="Table Name"
            size="small"
            value={data.tableName ?? ''}
            onChange={(e) => updateField('tableName', e.target.value)}
            fullWidth
            placeholder="e.g., players"
          />
        )}

        {/* Condition Node */}
        {nodeType === 'condition' && (
          <>
            <TextField
              label="Column"
              size="small"
              value={data.column ?? ''}
              onChange={(e) => updateField('column', e.target.value)}
              fullWidth
              placeholder="e.g., player_id"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Operator</InputLabel>
              <Select
                value={data.operator ?? '='}
                label="Operator"
                onChange={(e) => updateField('operator', e.target.value)}
              >
                {OPERATORS.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Value (literal)"
              size="small"
              value={data.value ?? ''}
              onChange={(e) => updateField('value', e.target.value)}
              fullWidth
              placeholder="Leave empty if using a context ref"
              helperText="Or connect a Context node as the value"
            />
            <TextField
              label="Value Ref (node ID)"
              size="small"
              value={data.valueRef ?? ''}
              onChange={(e) => updateField('valueRef', e.target.value)}
              fullWidth
              placeholder="e.g., ctx_1"
              helperText="ID of the context node to reference"
            />
          </>
        )}

        {/* Logic Gate Node */}
        {nodeType === 'logicGate' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Gate Type</InputLabel>
            <Select
              value={data.gateType ?? 'AND'}
              label="Gate Type"
              onChange={(e) => updateField('gateType', e.target.value)}
            >
              <MenuItem value="AND">AND</MenuItem>
              <MenuItem value="OR">OR</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Context Node */}
        {nodeType === 'context' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Variable</InputLabel>
            <Select
              value={data.variable ?? 'current_user_id'}
              label="Variable"
              onChange={(e) => updateField('variable', e.target.value)}
            >
              {CONTEXT_VARIABLES.map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
              ))}
              <MenuItem value="custom">Custom...</MenuItem>
            </Select>
          </FormControl>
        )}
        {nodeType === 'context' && data.variable === 'custom' && (
          <TextField
            label="Custom Variable"
            size="small"
            value={data.customVariable ?? ''}
            onChange={(e) => {
              updateField('customVariable', e.target.value);
              updateField('variable', e.target.value);
            }}
            fullWidth
            placeholder="e.g., tenant_id"
          />
        )}

        {/* Action Node */}
        {nodeType === 'action' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Action</InputLabel>
            <Select
              value={data.action ?? 'ALLOW'}
              label="Action"
              onChange={(e) => updateField('action', e.target.value)}
            >
              <MenuItem value="ALLOW">ALLOW</MenuItem>
              <MenuItem value="DENY">DENY</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Subquery Node */}
        {nodeType === 'subquery' && (
          <>
            <TextField
              label="Table"
              size="small"
              value={data.table ?? ''}
              onChange={(e) => updateField('table', e.target.value)}
              fullWidth
              placeholder="e.g., role_permissions"
            />
            <TextField
              label="Join Column"
              size="small"
              value={data.joinColumn ?? ''}
              onChange={(e) => updateField('joinColumn', e.target.value)}
              fullWidth
              placeholder="e.g., role_id"
            />
            <TextField
              label="Condition"
              size="small"
              value={data.condition ?? ''}
              onChange={(e) => updateField('condition', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., user_id = current_user_id"
            />
          </>
        )}

        {/* Node info */}
        <Divider />
        <Typography variant="caption" color="text.disabled">
          Node ID: {selectedNode.id}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Type: {nodeType}
        </Typography>
      </Box>
    </Box>
  );
}
