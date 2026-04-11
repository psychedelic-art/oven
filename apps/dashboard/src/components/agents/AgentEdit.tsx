'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit, SimpleForm, TextInput, BooleanInput, useRecordContext } from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import ModelAliasSelect from './ModelAliasSelect';
import ToolBindingsEditor from './ToolBindingsEditor';
import InputSchemaEditor from './InputSchemaEditor';
import SystemPromptEditor from './SystemPromptEditor';
import AgentPlaygroundPanel from './AgentPlaygroundPanel';

function AgentEditForm() {
  const record = useRecordContext();
  const [modelAlias, setModelAlias] = useState('fast');
  const [toolBindings, setToolBindings] = useState<string[]>(['*']);
  const [inputSchema, setInputSchema] = useState<Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'select'; description?: string; defaultValue?: string; required?: boolean }>>([]);
  const systemPromptRef = useRef('');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from record
  useEffect(() => {
    if (!record || hydrated) return;
    const cfg = record.llmConfig as Record<string, unknown> | null;
    if (cfg?.model) setModelAlias(cfg.model as string);
    if (Array.isArray(record.toolBindings)) setToolBindings(record.toolBindings as string[]);
    if (Array.isArray(record.inputSchema)) setInputSchema(record.inputSchema as typeof inputSchema);
    if (record.systemPrompt) systemPromptRef.current = record.systemPrompt as string;
    setHydrated(true);
  }, [record, hydrated]);

  if (!record) return null;

  return (
    <SimpleForm
      transform={(data: Record<string, unknown>) => ({
        ...data,
        llmConfig: { ...(data.llmConfig as Record<string, unknown> ?? {}), model: modelAlias },
        toolBindings,
        inputSchema,
        systemPrompt: systemPromptRef.current,
      })}
    >
      <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Left — Identity + Config */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Identity</Typography>
          <TextInput source="name" label="Name" isRequired fullWidth />
          <TextInput source="slug" label="Slug" fullWidth />
          <TextInput source="description" label="Description" multiline rows={2} fullWidth />

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">LLM Configuration</Typography>
          <ModelAliasSelect value={modelAlias} onChange={setModelAlias} />

          <Divider sx={{ my: 1 }} />
          <InputSchemaEditor value={inputSchema} onChange={setInputSchema} />

          <Divider sx={{ my: 1 }} />
          <SystemPromptEditor
            value={hydrated ? systemPromptRef.current : ''}
            onChange={(v) => { systemPromptRef.current = v; }}
            inputSchema={inputSchema}
          />
        </Box>

        {/* Right — Tools + Settings */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ToolBindingsEditor value={toolBindings} onChange={setToolBindings} />
          <Divider sx={{ my: 1 }} />
          <BooleanInput source="enabled" label="Enabled" />
        </Box>
      </Box>

      {/* Playground Panel */}
      <AgentPlaygroundPanel agentId={record.id as number} agentName={record.name as string} />
    </SimpleForm>
  );
}

export default function AgentEdit() {
  return (
    <Edit>
      <AgentEditForm />
    </Edit>
  );
}
