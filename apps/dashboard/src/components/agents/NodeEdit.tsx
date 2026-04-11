'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit, SimpleForm, TextInput, SelectInput, BooleanInput, useRecordContext, SaveButton, Toolbar } from 'react-admin';
import { Box, Typography, Divider, IconButton, Button, Paper, TextField, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false });

const categoryChoices = [
  { id: 'llm', name: 'LLM' },
  { id: 'tool', name: 'Tool' },
  { id: 'condition', name: 'Condition' },
  { id: 'transform', name: 'Transform' },
  { id: 'human-in-the-loop', name: 'Human Review' },
  { id: 'memory', name: 'Memory' },
];

interface SchemaParam {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

const SYSTEM_NODE_CODES: Record<string, string> = {
  llm: `/**
 * LLM Node — Language Model Invocation
 * Sends the conversation messages to the configured LLM.
 * Resolves model through module-ai's provider registry.
 * Returns text response or tool call requests.
 *
 * @param {Object} input.messages - Conversation history
 * @param {Object} input.model - Model alias (e.g., "fast", "smart")
 * @param {Object} context - Workflow state
 */
async function execute({ input, context, config }) {
  const { aiGenerateText } = require('@oven/module-ai');
  const result = await aiGenerateText({
    prompt: input.messages,
    model: config.model || 'fast',
    system: config.systemPrompt,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
  return { text: result.text, toolCalls: result.toolCalls };
}`,
  'tool-executor': `/**
 * Tool Executor — Executes tool calls from LLM
 * Resolves tools via ToolWrapper, executes HTTP calls.
 *
 * @param {Array} input.toolCalls - Tool call requests from LLM
 * @param {Object} context - Workflow state
 */
async function execute({ input, context, config }) {
  const { executeTool } = require('@oven/module-agent-core');
  const results = [];
  for (const call of input.toolCalls) {
    const result = await executeTool(call.tool, call.args);
    results.push({ name: call.name, result });
  }
  return { toolResults: results };
}`,
  condition: `/**
 * Condition — Branch based on state evaluation
 * Evaluates a guard expression against the context.
 * Returns { branch: "true" | "false" }
 */
async function execute({ input, context, config }) {
  const value = context[config.field];
  const result = eval(config.expression);
  return { branch: result ? 'true' : 'false' };
}`,
  transform: `/**
 * Transform — Reshape, filter, or enrich state data
 * Maps input fields to output fields using expressions.
 */
async function execute({ input, context, config }) {
  const output = {};
  for (const [key, expr] of Object.entries(config.mapping || {})) {
    output[key] = context[expr] ?? input[expr];
  }
  return output;
}`,
  'human-review': `/**
 * Human Review — Pause for approval
 * Emits interrupt event, waits for human decision.
 * Returns { decision: "approve" | "edit" | "reject" }
 */
async function execute({ input, context, config }) {
  // Engine handles the pause/resume lifecycle
  // This code runs after human provides decision
  return { decision: input.decision, feedback: input.feedback };
}`,
  memory: `/**
 * Memory — Read/write agent long-term memory
 * Uses module-ai embeddings + vector store for semantic retrieval.
 */
async function execute({ input, context, config }) {
  if (config.mode === 'read') {
    // Semantic search in memory store
    return { memories: [] };
  } else {
    // Write to memory store
    return { stored: true };
  }
}`,
};

function SchemaEditor({ label, value, onChange, readOnly }: { label: string; value: SchemaParam[]; onChange: (v: SchemaParam[]) => void; readOnly?: boolean }) {
  const addParam = () => onChange([...value, { name: '', type: 'string', description: '', required: false }]);
  const updateParam = (i: number, updates: Partial<SchemaParam>) => {
    const updated = [...value];
    updated[i] = { ...updated[i], ...updates };
    onChange(updated);
  };
  const removeParam = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>{label}</Typography>
        {!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={addParam} sx={{ textTransform: 'none', fontSize: 12 }}>Add</Button>}
      </Box>
      {value.length === 0 && <Typography variant="caption" color="text.disabled">No parameters defined</Typography>}
      {value.map((param, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
          <TextField size="small" label="Name" value={param.name} onChange={(e) => updateParam(i, { name: e.target.value })} sx={{ flex: 1 }} disabled={readOnly} />
          <TextField select size="small" label="Type" value={param.type} onChange={(e) => updateParam(i, { type: e.target.value })} sx={{ width: 100 }} disabled={readOnly}>
            <MenuItem value="string">string</MenuItem>
            <MenuItem value="number">number</MenuItem>
            <MenuItem value="boolean">boolean</MenuItem>
            <MenuItem value="object">object</MenuItem>
            <MenuItem value="array">array</MenuItem>
          </TextField>
          <TextField size="small" label="Desc" value={param.description} onChange={(e) => updateParam(i, { description: e.target.value })} sx={{ flex: 1 }} disabled={readOnly} />
          {!readOnly && <IconButton size="small" onClick={() => removeParam(i)} color="error"><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>}
        </Box>
      ))}
    </Box>
  );
}

function NodeToolbar() {
  return <Toolbar><SaveButton /></Toolbar>;
}

// Module-level refs for transform (avoids SimpleForm transform prop)
let _code = '';
let _inputs: SchemaParam[] = [];
let _outputs: SchemaParam[] = [];

function NodeEditForm() {
  const record = useRecordContext();
  const [code, setCode] = useState('');
  const [inputs, setInputs] = useState<SchemaParam[]>([]);
  const [outputs, setOutputs] = useState<SchemaParam[]>([]);

  useEffect(() => {
    if (!record) return;
    const slug = record.slug as string;
    const existingCode = record.code as string;
    // If system node has no code, show the reference implementation
    const displayCode = existingCode || SYSTEM_NODE_CODES[slug] || '';
    setCode(displayCode);
    if (Array.isArray(record.inputs)) setInputs(record.inputs as SchemaParam[]);
    if (Array.isArray(record.outputs)) setOutputs(record.outputs as SchemaParam[]);
  }, [record]);

  // Sync to module-level refs for transform
  useEffect(() => { _code = code; }, [code]);
  useEffect(() => { _inputs = inputs; }, [inputs]);
  useEffect(() => { _outputs = outputs; }, [outputs]);

  if (!record) return null;
  const isSystem = record.isSystem as boolean;

  return (
    <SimpleForm toolbar={<NodeToolbar />}>
      <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextInput source="name" label="Name" isRequired fullWidth disabled={isSystem} />
          <TextInput source="slug" label="Slug" fullWidth disabled={isSystem} />
          <SelectInput source="category" label="Category" choices={categoryChoices} isRequired fullWidth disabled={isSystem} />
          <TextInput source="description" label="Description" multiline rows={3} fullWidth />
          <BooleanInput source="isSystem" label="System Node" disabled />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <SchemaEditor label="Input Parameters" value={inputs} onChange={setInputs} readOnly={isSystem} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <SchemaEditor label="Output Parameters" value={outputs} onChange={setOutputs} readOnly={isSystem} />
          </Paper>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Node Implementation {isSystem && <Typography component="span" variant="caption" color="text.secondary">(read-only for system nodes)</Typography>}
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', width: '100%' }}>
        <MonacoEditor
          width="100%"
          height="400px"
          language="javascript"
          value={code}
          onChange={(v) => { if (!isSystem) setCode(v ?? ''); }}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            readOnly: isSystem,
            automaticLayout: true,
          }}
        />
      </Box>
    </SimpleForm>
  );
}

export default function NodeEdit() {
  return (
    <Edit
      transform={(data: Record<string, unknown>) => ({
        ...data,
        code: _code || data.code,
        inputs: _inputs.length > 0 ? _inputs : data.inputs,
        outputs: _outputs.length > 0 ? _outputs : data.outputs,
      })}
    >
      <NodeEditForm />
    </Edit>
  );
}
