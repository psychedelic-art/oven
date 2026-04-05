'use client';

import { useState } from 'react';
import { Create, SimpleForm, TextInput, SelectInput, BooleanInput, SaveButton, Toolbar } from 'react-admin';
import { Box, Typography, Divider, IconButton, Button, Paper, TextField, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false });

const DEFAULT_NODE_CODE = `/**
 * Node execution function.
 * @param {Object} input - Values mapped from input schema
 * @param {Object} context - Workflow execution context ($.path variables)
 * @param {Object} config - Node configuration
 * @returns {Object} Output matching the output schema
 */
async function execute({ input, context, config }) {
  // Access input variables:
  // const myVar = input.myVariable;

  // Return output:
  return {
    result: null,
  };
}
`;

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

function SchemaEditor({ label, value, onChange }: { label: string; value: SchemaParam[]; onChange: (v: SchemaParam[]) => void }) {
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
        <Button size="small" startIcon={<AddIcon />} onClick={addParam} sx={{ textTransform: 'none', fontSize: 12 }}>Add</Button>
      </Box>
      {value.length === 0 && (
        <Typography variant="caption" color="text.disabled">No parameters defined</Typography>
      )}
      {value.map((param, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
          <TextField size="small" label="Name" value={param.name} onChange={(e) => updateParam(i, { name: e.target.value })} sx={{ flex: 1 }} />
          <TextField select size="small" label="Type" value={param.type} onChange={(e) => updateParam(i, { type: e.target.value })} sx={{ width: 100 }}>
            <MenuItem value="string">string</MenuItem>
            <MenuItem value="number">number</MenuItem>
            <MenuItem value="boolean">boolean</MenuItem>
            <MenuItem value="object">object</MenuItem>
            <MenuItem value="array">array</MenuItem>
          </TextField>
          <TextField size="small" label="Desc" value={param.description} onChange={(e) => updateParam(i, { description: e.target.value })} sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => removeParam(i)} color="error"><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
        </Box>
      ))}
    </Box>
  );
}

// Custom toolbar to avoid transform prop on DOM
function NodeToolbar() {
  return <Toolbar><SaveButton /></Toolbar>;
}

export default function NodeCreate() {
  const [code, setCode] = useState(DEFAULT_NODE_CODE);
  const [inputs, setInputs] = useState<SchemaParam[]>([{ name: 'input', type: 'string', description: 'Primary input', required: true }]);
  const [outputs, setOutputs] = useState<SchemaParam[]>([{ name: 'result', type: 'object', description: 'Node output', required: false }]);

  return (
    <Create
      transform={(data: Record<string, unknown>) => ({
        ...data,
        code,
        inputs,
        outputs,
      })}
    >
      <SimpleForm toolbar={<NodeToolbar />}>
        <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left — Identity */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextInput source="name" label="Name" isRequired fullWidth />
            <TextInput source="slug" label="Slug" fullWidth helperText="Auto-generated from name if empty" />
            <SelectInput source="category" label="Category" choices={categoryChoices} isRequired fullWidth />
            <TextInput source="description" label="Description" multiline rows={3} fullWidth />
            <BooleanInput source="isSystem" label="System Node" defaultValue={false} />
          </Box>

          {/* Right — Input/Output Schemas */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <SchemaEditor label="Input Parameters" value={inputs} onChange={setInputs} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <SchemaEditor label="Output Parameters" value={outputs} onChange={setOutputs} />
            </Paper>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Node Implementation</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          The execute function receives input (from input schema), context (workflow state), and config (node settings).
        </Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', width: '100%' }}>
          <MonacoEditor
            width="100%"
            height="350px"
            language="javascript"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            theme="vs-light"
            options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, automaticLayout: true }}
          />
        </Box>
      </SimpleForm>
    </Create>
  );
}
