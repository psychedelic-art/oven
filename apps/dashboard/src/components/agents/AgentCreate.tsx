'use client';

import { useState, useRef } from 'react';
import { Create, SimpleForm, TextInput, BooleanInput } from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import ModelAliasSelect from './ModelAliasSelect';
import ToolBindingsEditor from './ToolBindingsEditor';
import InputSchemaEditor from './InputSchemaEditor';
import SystemPromptEditor from './SystemPromptEditor';

export default function AgentCreate() {
  const [modelAlias, setModelAlias] = useState('fast');
  const [toolBindings, setToolBindings] = useState<string[]>(['*']);
  const [inputSchema, setInputSchema] = useState<Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'select'; description?: string; defaultValue?: string; required?: boolean }>>([]);
  // Use ref for prompt to avoid re-rendering entire form on every keystroke
  const systemPromptRef = useRef('');

  return (
    <Create
      transform={(data: Record<string, unknown>) => ({
        ...data,
        llmConfig: { model: modelAlias },
        toolBindings,
        inputSchema,
        systemPrompt: systemPromptRef.current,
        exposedParams: ['temperature', 'maxTokens'],
      })}
    >
      <SimpleForm>
        <Box sx={{ display: 'flex', gap: 3, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left — Identity + Config */}
          <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Identity</Typography>
            <TextInput source="name" label="Name" isRequired fullWidth />
            <TextInput source="slug" label="Slug" fullWidth helperText="Auto-generated from name if empty" />
            <TextInput source="description" label="Description" multiline rows={2} fullWidth />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">LLM Configuration</Typography>
            <ModelAliasSelect value={modelAlias} onChange={setModelAlias} />

            <Divider sx={{ my: 1 }} />
            <InputSchemaEditor value={inputSchema} onChange={setInputSchema} />

            <Divider sx={{ my: 1 }} />
            <SystemPromptEditor
              value=""
              onChange={(v) => { systemPromptRef.current = v; }}
              inputSchema={inputSchema}
            />
          </Box>

          {/* Right — Tools + Settings */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ToolBindingsEditor value={toolBindings} onChange={setToolBindings} />

            <Divider sx={{ my: 1 }} />
            <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
          </Box>
        </Box>
      </SimpleForm>
    </Create>
  );
}
