'use client';

import React, { useState } from 'react';
import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  required,
  useInput,
} from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';
import { AgentConfigForm } from './AgentConfigForm';
import { DefinitionBuilder } from './DefinitionBuilder';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'active', name: 'Active' },
];

// Custom field wrapper for AgentConfigForm
function AgentConfigField() {
  const configInput = useInput({ source: 'agentConfig' });
  const memoryInput = useInput({ source: 'memoryConfig' });

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Agent Configuration</Typography>
      <AgentConfigForm
        value={configInput.field.value}
        onChange={(val) => configInput.field.onChange(val)}
        showMemory
        memoryValue={memoryInput.field.value}
        onMemoryChange={(val) => memoryInput.field.onChange(val)}
      />
    </Box>
  );
}

// Custom field wrapper for DefinitionBuilder
function DefinitionField() {
  const input = useInput({ source: 'definition' });

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <DefinitionBuilder
        value={input.field.value}
        onChange={(val) => input.field.onChange(val)}
      />
    </Box>
  );
}

export function AgentWorkflowCreate() {
  return (
    <Create>
      <SimpleForm>
        <Typography variant="h6" sx={{ mb: 2 }}>Create Agent Workflow</Typography>

        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" fullWidth helperText="Auto-generated from name if empty" />
        <TextInput source="description" fullWidth multiline rows={2} />
        <NumberInput source="agentId" label="Agent ID" helperText="Link to an existing agent (optional)" />
        <SelectInput source="status" choices={statusChoices} defaultValue="draft" />

        <DefinitionField />
        <AgentConfigField />
      </SimpleForm>
    </Create>
  );
}
