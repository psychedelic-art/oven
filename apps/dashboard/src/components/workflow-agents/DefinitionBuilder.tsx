'use client';

import React, { useState, useCallback } from 'react';
import {
  Box, Typography, TextField, MenuItem, IconButton, Button, Chip, Switch, FormControlLabel,
  Paper, Divider, Tooltip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CodeIcon from '@mui/icons-material/Code';
import ViewListIcon from '@mui/icons-material/ViewList';

// ─── Node Type Definitions ──────────────────────────────────

const NODE_TYPES = [
  { slug: 'llm', label: 'LLM', icon: '🧠', category: 'AI' },
  { slug: 'tool-executor', label: 'Tool Executor', icon: '🔧', category: 'Tools' },
  { slug: 'condition', label: 'Condition', icon: '🔀', category: 'Logic' },
  { slug: 'transform', label: 'Transform', icon: '🔄', category: 'Logic' },
  { slug: 'rag', label: 'RAG Retrieval', icon: '📚', category: 'Knowledge' },
  { slug: 'memory', label: 'Memory', icon: '💾', category: 'Knowledge' },
  { slug: 'human-review', label: 'Human Review', icon: '👤', category: 'Control' },
  { slug: 'subagent', label: 'Subagent', icon: '🤖', category: 'AI' },
  { slug: 'prompt', label: 'Prompt Assembly', icon: '📝', category: 'AI' },
  { slug: 'switch', label: 'Switch/Router', icon: '🔀', category: 'Logic' },
];

interface StateNode {
  id: string;
  nodeType: string;
  config: Record<string, unknown>;
  onDone: string;
  onError?: string;
}

interface DefinitionBuilderProps {
  value: Record<string, unknown> | string | null;
  onChange: (definition: Record<string, unknown>) => void;
}

export function DefinitionBuilder({ value, onChange }: DefinitionBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const definition = parseDefinition(value);
  const nodes = definitionToNodes(definition);
  const [jsonText, setJsonText] = useState(JSON.stringify(definition, null, 2));

  const updateNodes = useCallback((newNodes: StateNode[]) => {
    const newDef = nodesToDefinition(newNodes);
    onChange(newDef);
    setJsonText(JSON.stringify(newDef, null, 2));
  }, [onChange]);

  const addNode = useCallback(() => {
    const id = `node_${nodes.length + 1}`;
    const newNodes = [
      ...nodes.filter(n => n.nodeType !== 'end'),
      { id, nodeType: 'llm', config: {}, onDone: 'done' },
      { id: 'done', nodeType: 'end', config: {}, onDone: '' },
    ];
    // Fix chain: previous node points to new node
    if (newNodes.length > 2) {
      newNodes[newNodes.length - 3].onDone = id;
    }
    updateNodes(newNodes);
  }, [nodes, updateNodes]);

  const removeNode = useCallback((nodeId: string) => {
    if (nodeId === 'done') return;
    const filtered = nodes.filter(n => n.id !== nodeId);
    // Fix broken references
    for (const n of filtered) {
      if (n.onDone === nodeId) {
        const nextIdx = nodes.findIndex(x => x.id === nodeId);
        const nextNode = nodes[nextIdx + 1];
        n.onDone = nextNode?.id ?? 'done';
      }
    }
    updateNodes(filtered);
  }, [nodes, updateNodes]);

  const updateNode = useCallback((nodeId: string, updates: Partial<StateNode>) => {
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
    updateNodes(newNodes);
  }, [nodes, updateNodes]);

  const handleJsonChange = useCallback((text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.states && parsed.initial) {
        onChange(parsed);
      }
    } catch { /* let user finish typing */ }
  }, [onChange]);

  return (
    <Box>
      {/* Mode Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Workflow Definition</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Visual Builder">
            <IconButton size="small" onClick={() => setMode('visual')} color={mode === 'visual' ? 'primary' : 'default'}>
              <ViewListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="JSON Editor">
            <IconButton size="small" onClick={() => { setMode('json'); setJsonText(JSON.stringify(definition, null, 2)); }} color={mode === 'json' ? 'primary' : 'default'}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {mode === 'json' ? (
        <TextField
          multiline
          rows={16}
          value={jsonText}
          onChange={e => handleJsonChange(e.target.value)}
          fullWidth
          sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
          helperText="Edit the raw JSON definition"
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {nodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              <NodeCard
                node={node}
                allNodes={nodes}
                onUpdate={(updates) => updateNode(node.id, updates)}
                onRemove={() => removeNode(node.id)}
                isFirst={idx === 0}
                isEnd={node.nodeType === 'end'}
              />
              {idx < nodes.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <ArrowDownwardIcon sx={{ color: 'grey.400', fontSize: 20 }} />
                </Box>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addNode}
            sx={{ mt: 1 }}
            size="small"
          >
            Add Node
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ─── Node Card ──────────────────────────────────────────────

function NodeCard({ node, allNodes, onUpdate, onRemove, isFirst, isEnd }: {
  node: StateNode;
  allNodes: StateNode[];
  onUpdate: (updates: Partial<StateNode>) => void;
  onRemove: () => void;
  isFirst: boolean;
  isEnd: boolean;
}) {
  const nodeTypeDef = NODE_TYPES.find(n => n.slug === node.nodeType);

  if (isEnd) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50', textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>🏁 End</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, position: 'relative' }}>
      {isFirst && <Chip label="Entry" size="small" color="primary" sx={{ position: 'absolute', top: -10, left: 12, fontSize: 10 }} />}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Node ID */}
        <TextField
          label="Node ID"
          value={node.id}
          onChange={e => onUpdate({ id: e.target.value })}
          size="small"
          sx={{ width: 140 }}
        />

        {/* Node Type */}
        <TextField
          select
          label="Type"
          value={node.nodeType}
          onChange={e => onUpdate({ nodeType: e.target.value, config: {} })}
          size="small"
          sx={{ width: 160 }}
        >
          {NODE_TYPES.filter(n => n.slug !== 'end').map(nt => (
            <MenuItem key={nt.slug} value={nt.slug}>
              {nt.icon} {nt.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Next Node */}
        <TextField
          select
          label="→ Next"
          value={node.onDone}
          onChange={e => onUpdate({ onDone: e.target.value })}
          size="small"
          sx={{ width: 140 }}
        >
          {allNodes.filter(n => n.id !== node.id).map(n => (
            <MenuItem key={n.id} value={n.id}>{n.id}</MenuItem>
          ))}
        </TextField>

        <IconButton size="small" color="error" onClick={onRemove} sx={{ mt: 0.5 }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Node Config Fields */}
      <NodeConfigFields node={node} onConfigChange={(config) => onUpdate({ config })} />
    </Paper>
  );
}

// ─── Per-Type Config Fields ─────────────────────────────────

function NodeConfigFields({ node, onConfigChange }: { node: StateNode; onConfigChange: (config: Record<string, unknown>) => void }) {
  const cfg = node.config;
  const update = (field: string, val: unknown) => onConfigChange({ ...cfg, [field]: val });

  switch (node.nodeType) {
    case 'llm':
      return (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField select label="Model" value={cfg.model ?? 'fast'} onChange={e => update('model', e.target.value)} size="small" fullWidth>
            <MenuItem value="fast">Fast</MenuItem><MenuItem value="smart">Smart</MenuItem><MenuItem value="claude">Claude</MenuItem>
          </TextField>
          <TextField label="System Prompt" value={cfg.systemPrompt ?? ''} onChange={e => update('systemPrompt', e.target.value)} size="small" multiline rows={2} fullWidth />
        </Box>
      );

    case 'condition':
      return (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <TextField label="Field" value={cfg.field ?? ''} onChange={e => update('field', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField select label="Operator" value={cfg.operator ?? '=='} onChange={e => update('operator', e.target.value)} size="small" sx={{ width: 120 }}>
            <MenuItem value="==">==</MenuItem><MenuItem value="!=">!=</MenuItem>
            <MenuItem value=">">{'>'}</MenuItem><MenuItem value="<">{'<'}</MenuItem>
            <MenuItem value="exists">exists</MenuItem><MenuItem value="contains">contains</MenuItem>
          </TextField>
          <TextField label="Value" value={cfg.value ?? ''} onChange={e => update('value', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Box>
      );

    case 'rag':
      return (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <TextField label="Query ($.path)" value={cfg.query ?? ''} onChange={e => update('query', e.target.value)} size="small" sx={{ flex: 2 }} />
          <TextField label="Max Results" type="number" value={cfg.maxResults ?? 5} onChange={e => update('maxResults', parseInt(e.target.value))} size="small" sx={{ width: 100 }} />
        </Box>
      );

    case 'memory':
      return (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <TextField select label="Mode" value={cfg.mode ?? 'read'} onChange={e => update('mode', e.target.value)} size="small" sx={{ width: 100 }}>
            <MenuItem value="read">Read</MenuItem><MenuItem value="write">Write</MenuItem>
          </TextField>
          <TextField label="Key" value={cfg.key ?? ''} onChange={e => update('key', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label={cfg.mode === 'write' ? 'Content' : 'Query'} value={(cfg.mode === 'write' ? cfg.content : cfg.query) ?? ''} onChange={e => update(cfg.mode === 'write' ? 'content' : 'query', e.target.value)} size="small" sx={{ flex: 2 }} />
        </Box>
      );

    case 'subagent':
      return (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <TextField label="Agent Slug" value={cfg.agentSlug ?? ''} onChange={e => update('agentSlug', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Message ($.path)" value={cfg.message ?? ''} onChange={e => update('message', e.target.value)} size="small" sx={{ flex: 2 }} />
        </Box>
      );

    case 'human-review':
      return (
        <Box sx={{ mt: 1.5 }}>
          <TextField label="Review Reason" value={cfg.reason ?? ''} onChange={e => update('reason', e.target.value)} size="small" fullWidth multiline rows={2} />
        </Box>
      );

    case 'prompt':
      return (
        <Box sx={{ mt: 1.5 }}>
          <TextField label="Template (use {{var}})" value={cfg.template ?? ''} onChange={e => update('template', e.target.value)} size="small" fullWidth multiline rows={3} />
        </Box>
      );

    case 'switch':
      return (
        <Box sx={{ mt: 1.5 }}>
          <TextField label="Field to route on" value={cfg.field ?? ''} onChange={e => update('field', e.target.value)} size="small" fullWidth helperText="The context field to evaluate for routing" />
          <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>Switch nodes support multiple outputs. Configure branches in the visual editor for full multi-output support.</Alert>
        </Box>
      );

    default:
      return null;
  }
}

// ─── Conversion Helpers ─────────────────────────────────────

function parseDefinition(value: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
  if (!value) return { id: 'new-workflow', initial: 'start', states: { start: { invoke: { src: 'llm', input: {}, onDone: 'done' } }, done: { type: 'final' } } };
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return { id: 'new-workflow', initial: 'start', states: { start: { type: 'final' } } }; }
  }
  return value;
}

function definitionToNodes(def: Record<string, unknown>): StateNode[] {
  const states = (def.states ?? {}) as Record<string, Record<string, unknown>>;
  const initial = def.initial as string ?? 'start';
  const nodes: StateNode[] = [];

  // Build ordered list starting from initial
  const visited = new Set<string>();
  let current = initial;
  while (current && !visited.has(current)) {
    visited.add(current);
    const state = states[current];
    if (!state) break;

    if (state.type === 'final') {
      nodes.push({ id: current, nodeType: 'end', config: {}, onDone: '' });
      break;
    }

    const invoke = state.invoke as Record<string, unknown> | undefined;
    nodes.push({
      id: current,
      nodeType: (invoke?.src as string) ?? 'llm',
      config: (invoke?.input as Record<string, unknown>) ?? {},
      onDone: typeof invoke?.onDone === 'string' ? invoke.onDone : (invoke?.onDone as Record<string, unknown>)?.target as string ?? 'done',
      onError: invoke?.onError as string | undefined,
    });

    const next = typeof invoke?.onDone === 'string' ? invoke.onDone : (invoke?.onDone as Record<string, unknown>)?.target as string;
    current = next ?? '';
  }

  // Add any unvisited states
  for (const [id, state] of Object.entries(states)) {
    if (!visited.has(id)) {
      if ((state as Record<string, unknown>).type === 'final') {
        nodes.push({ id, nodeType: 'end', config: {}, onDone: '' });
      }
    }
  }

  return nodes;
}

function nodesToDefinition(nodes: StateNode[]): Record<string, unknown> {
  const states: Record<string, unknown> = {};
  const initial = nodes[0]?.id ?? 'start';

  for (const node of nodes) {
    if (node.nodeType === 'end') {
      states[node.id] = { type: 'final' };
    } else {
      states[node.id] = {
        invoke: {
          src: node.nodeType,
          input: Object.keys(node.config).length > 0 ? node.config : undefined,
          onDone: node.onDone || 'done',
          ...(node.onError ? { onError: node.onError } : {}),
        },
      };
    }
  }

  return { id: 'agent-workflow', initial, states };
}
