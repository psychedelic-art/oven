import React from 'react';
import { Box, Typography, TextField, Select, MenuItem, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Node } from '@xyflow/react';
import type { NodeTypeDefinition, ContextVariable, PayloadProperty } from '@oven/module-workflows/types';
import { InputMapper } from '../components/InputMapper';
import { VariablePicker } from '../components/VariablePicker';
import { TriggerSchemaEditor } from '../components/TriggerSchemaEditor';

interface NodeInspectorProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
  /** Map of nodeTypeId → NodeTypeDefinition from registry */
  nodeTypeMap?: Map<string, NodeTypeDefinition>;
  /** Available variables at this node from context flow */
  availableVariables?: ContextVariable[];
}

/**
 * Right-side panel for editing the properties of a selected workflow node.
 * Now with smart input mapping, variable autocomplete, and payload schema editor.
 */
export function NodeInspector({
  selectedNode,
  onUpdateNode,
  onClose,
  nodeTypeMap,
  availableVariables = [],
}: NodeInspectorProps) {
  if (!selectedNode) return null;

  const data = (selectedNode.data ?? {}) as Record<string, any>;
  const nodeType = selectedNode.type ?? 'unknown';

  const update = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, { ...data, [key]: value });
  };

  // Resolve the NodeTypeDefinition for apiCall nodes
  const nodeTypeDef = nodeType === 'apiCall' && data.nodeTypeId
    ? nodeTypeMap?.get(data.nodeTypeId) ?? null
    : null;

  return (
    <Box
      sx={{
        width: 320,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">Node Properties</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary">
        ID: {selectedNode.id}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Type: {nodeType}
      </Typography>

      <TextField
        size="small"
        label="Label"
        value={data.label ?? ''}
        onChange={(e: any) => update('label', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Divider sx={{ mb: 2 }} />

      {/* ── Trigger Node ── */}
      {nodeType === 'trigger' && (
        <>
          <TextField
            size="small"
            label="Trigger Event"
            value={data.triggerEvent ?? ''}
            onChange={(e: any) => update('triggerEvent', e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            helperText="Set on the workflow level, not per-node"
            disabled
          />
          <Divider sx={{ mb: 1.5 }} />
          <TriggerSchemaEditor
            schema={data.payloadSchema ?? []}
            onChange={(schema: PayloadProperty[]) => update('payloadSchema', schema)}
          />
        </>
      )}

      {/* ── API Call Node ── */}
      {nodeType === 'apiCall' && (
        <>
          <TextField
            size="small"
            label="Node Type ID"
            value={data.nodeTypeId ?? ''}
            onChange={(e: any) => update('nodeTypeId', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
            helperText="e.g. maps.maps.create, players.get"
          />

          {nodeTypeDef && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: 'block', fontStyle: 'italic', fontSize: 10 }}
            >
              {nodeTypeDef.description}
              {nodeTypeDef.method && ` — ${nodeTypeDef.method} /${nodeTypeDef.route}`}
            </Typography>
          )}

          <Divider sx={{ mb: 1.5 }} />

          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            Input Mapping
          </Typography>

          <InputMapper
            nodeTypeDef={nodeTypeDef}
            inputMapping={data.inputMapping ?? {}}
            availableVariables={availableVariables}
            onChange={(mapping) => update('inputMapping', mapping)}
          />
        </>
      )}

      {/* ── Condition Node ── */}
      {nodeType === 'condition' && (
        <>
          <VariablePicker
            value={data.key ?? ''}
            onChange={(val) => update('key', val)}
            availableVariables={availableVariables}
            label="Key"
            placeholder="$.path to check"
            helperText="Payload key to evaluate"
          />
          <Select
            size="small"
            value={data.operator ?? '=='}
            onChange={(e: any) => update('operator', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          >
            <MenuItem value="==">== (equals)</MenuItem>
            <MenuItem value="!=">!= (not equals)</MenuItem>
            <MenuItem value=">">&gt; (greater than)</MenuItem>
            <MenuItem value="<">&lt; (less than)</MenuItem>
            <MenuItem value=">=">&gt;= (gte)</MenuItem>
            <MenuItem value="<=">&lt;= (lte)</MenuItem>
            <MenuItem value="contains">contains</MenuItem>
            <MenuItem value="exists">exists</MenuItem>
          </Select>
          <TextField
            size="small"
            label="Value"
            value={data.value ?? ''}
            onChange={(e: any) => update('value', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
        </>
      )}

      {/* ── Transform Node ── */}
      {nodeType === 'transform' && (
        <TextField
          size="small"
          label="Mapping (JSON)"
          value={JSON.stringify(data.mapping ?? {}, null, 2)}
          onChange={(e: any) => {
            try {
              update('mapping', JSON.parse(e.target.value));
            } catch { /* ignore */ }
          }}
          fullWidth
          multiline
          rows={6}
          sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
          helperText='{ "targetKey": "$.sourceKey" }'
        />
      )}

      {/* ── Event Emit Node ── */}
      {nodeType === 'eventEmit' && (
        <>
          <TextField
            size="small"
            label="Event Name"
            value={data.eventName ?? ''}
            onChange={(e: any) => update('eventName', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
            helperText="e.g. players.player.created"
          />
          <TextField
            size="small"
            label="Payload (JSON)"
            value={JSON.stringify(data.payload ?? {}, null, 2)}
            onChange={(e: any) => {
              try {
                update('payload', JSON.parse(e.target.value));
              } catch { /* ignore */ }
            }}
            fullWidth
            multiline
            rows={4}
            sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
          />
        </>
      )}

      {/* ── Delay Node ── */}
      {nodeType === 'delay' && (
        <TextField
          size="small"
          label="Delay (ms)"
          type="number"
          value={data.ms ?? 1000}
          onChange={(e: any) => update('ms', parseInt(e.target.value, 10))}
          fullWidth
          sx={{ mb: 1.5 }}
        />
      )}

      {/* ── Set Variable Node ── */}
      {nodeType === 'setVariable' && (
        <>
          <TextField
            size="small"
            label="Variable Name"
            value={data.variableName ?? ''}
            onChange={(e: any) => update('variableName', e.target.value)}
            fullWidth
            sx={{ mb: 1.5, '& input': { fontFamily: 'monospace' } }}
            helperText="Name for the new variable in context"
          />
          <VariablePicker
            value={data.variableValue ?? ''}
            onChange={(val) => update('variableValue', val)}
            availableVariables={availableVariables}
            label="Value"
            placeholder="$.path or literal value"
            helperText="Reference an upstream variable or enter a literal"
          />
        </>
      )}

      {/* ── ForEach Node ── */}
      {nodeType === 'forEach' && (
        <>
          <VariablePicker
            value={data.collection ?? ''}
            onChange={(val) => update('collection', val)}
            availableVariables={availableVariables}
            label="Collection"
            placeholder="$.path to array"
            helperText="Array to iterate over"
          />
          <TextField
            size="small"
            label="Item Variable"
            value={data.itemVariable ?? 'item'}
            onChange={(e: any) => update('itemVariable', e.target.value)}
            fullWidth
            sx={{ mb: 1.5, '& input': { fontFamily: 'monospace' } }}
            helperText="Variable name for current item"
          />
          <TextField
            size="small"
            label="Index Variable"
            value={data.indexVariable ?? 'index'}
            onChange={(e: any) => update('indexVariable', e.target.value)}
            fullWidth
            sx={{ mb: 1.5, '& input': { fontFamily: 'monospace' } }}
            helperText="Variable name for current index"
          />
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>
            Limits
          </Typography>
          <TextField
            size="small"
            label="Max Iterations"
            type="number"
            value={data.maxIterations ?? 100}
            onChange={(e: any) => update('maxIterations', parseInt(e.target.value, 10))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="Timeout (ms)"
            type="number"
            value={data.timeoutMs ?? 50000}
            onChange={(e: any) => update('timeoutMs', parseInt(e.target.value, 10))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="Parallel Batch Size"
            type="number"
            value={data.parallelBatchSize ?? 0}
            onChange={(e: any) => update('parallelBatchSize', parseInt(e.target.value, 10))}
            fullWidth
            sx={{ mb: 1.5 }}
            helperText="0 = sequential, >0 = parallel batches"
          />
        </>
      )}

      {/* ── While Loop Node ── */}
      {nodeType === 'whileLoop' && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            Condition
          </Typography>
          <VariablePicker
            value={data.key ?? ''}
            onChange={(val) => update('key', val)}
            availableVariables={availableVariables}
            label="Key"
            placeholder="$.path to check"
            helperText="Value to evaluate each iteration"
          />
          <Select
            size="small"
            value={data.operator ?? '=='}
            onChange={(e: any) => update('operator', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          >
            <MenuItem value="==">== (equals)</MenuItem>
            <MenuItem value="!=">!= (not equals)</MenuItem>
            <MenuItem value=">">&gt; (greater than)</MenuItem>
            <MenuItem value="<">&lt; (less than)</MenuItem>
            <MenuItem value=">=">&gt;= (gte)</MenuItem>
            <MenuItem value="<=">&lt;= (lte)</MenuItem>
            <MenuItem value="contains">contains</MenuItem>
            <MenuItem value="exists">exists</MenuItem>
          </Select>
          <TextField
            size="small"
            label="Value"
            value={data.value ?? ''}
            onChange={(e: any) => update('value', e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', color: 'text.secondary' }}>
            Limits
          </Typography>
          <TextField
            size="small"
            label="Max Iterations"
            type="number"
            value={data.maxIterations ?? 100}
            onChange={(e: any) => update('maxIterations', parseInt(e.target.value, 10))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            size="small"
            label="Timeout (ms)"
            type="number"
            value={data.timeoutMs ?? 50000}
            onChange={(e: any) => update('timeoutMs', parseInt(e.target.value, 10))}
            fullWidth
            sx={{ mb: 1.5 }}
          />
        </>
      )}

      {/* ── SQL Query Node ── */}
      {nodeType === 'sqlQuery' && (
        <>
          <TextField
            size="small"
            label="SQL Query"
            value={data.query ?? ''}
            onChange={(e: any) => update('query', e.target.value)}
            fullWidth
            multiline
            rows={4}
            sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
            helperText="Use $1, $2, etc. for parameters"
          />
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            Parameters
          </Typography>
          {(data.params ?? []).map((param: string, index: number) => (
            <VariablePicker
              key={index}
              value={param}
              onChange={(val) => {
                const newParams = [...(data.params ?? [])];
                newParams[index] = val;
                update('params', newParams);
              }}
              availableVariables={availableVariables}
              label={`$${index + 1}`}
              placeholder="$.path or literal"
              size="small"
            />
          ))}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Add parameter..."
              onKeyDown={(e: any) => {
                if (e.key === 'Enter' && e.target.value) {
                  update('params', [...(data.params ?? []), e.target.value]);
                  e.target.value = '';
                }
              }}
              sx={{ flex: 1, '& input': { fontSize: 11, fontFamily: 'monospace' } }}
              helperText="Press Enter to add"
            />
          </Box>
        </>
      )}

      {/* ── Available Variables Debug ── */}
      {availableVariables.length > 0 && nodeType !== 'trigger' && nodeType !== 'end' && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 9, textTransform: 'uppercase' }}
          >
            Available Variables ({availableVariables.filter(v => !v.name.includes('_output.')).length})
          </Typography>
          <Box sx={{ mt: 0.5, maxHeight: 120, overflow: 'auto' }}>
            {availableVariables
              .filter(v => !v.name.includes('_output.'))
              .map((v) => (
                <Typography
                  key={v.path}
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: 'text.secondary',
                    lineHeight: 1.6,
                  }}
                >
                  {v.path} <span style={{ color: '#999' }}>({v.type})</span>
                </Typography>
              ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
