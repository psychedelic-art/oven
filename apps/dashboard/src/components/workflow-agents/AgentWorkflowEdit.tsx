'use client';

import React from 'react';
import {
  Edit,
  TabbedForm,
  FormTab,
  TextInput,
  SelectInput,
  NumberInput,
  required,
  useInput,
  Toolbar,
  SaveButton,
} from 'react-admin';
import { Box, Typography, Button, Divider } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { AgentConfigForm } from './AgentConfigForm';
import { DefinitionBuilder } from './DefinitionBuilder';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
];

function AgentConfigField() {
  const configInput = useInput({ source: 'agentConfig' });
  const memoryInput = useInput({ source: 'memoryConfig' });
  return (
    <AgentConfigForm
      value={configInput.field.value}
      onChange={(val) => configInput.field.onChange(val)}
      showMemory
      memoryValue={memoryInput.field.value}
      onMemoryChange={(val) => memoryInput.field.onChange(val)}
    />
  );
}

function DefinitionField() {
  const input = useInput({ source: 'definition' });
  return (
    <DefinitionBuilder
      value={input.field.value}
      onChange={(val) => input.field.onChange(val)}
    />
  );
}

function EditToolbar() {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleClone = async () => {
    try {
      const res = await fetch(`/api/agent-workflows/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/agent-workflows/${data.id}`);
      }
    } catch { /* ignore */ }
  };

  return (
    <Toolbar sx={{ display: 'flex', gap: 1 }}>
      <SaveButton />
      <Button
        variant="outlined"
        startIcon={<EditNoteIcon />}
        onClick={() => navigate(`/agent-workflows/${id}/editor`)}
        size="small"
      >
        Visual Editor
      </Button>
      <Button
        variant="outlined"
        startIcon={<ContentCopyIcon />}
        onClick={handleClone}
        size="small"
      >
        Clone
      </Button>
    </Toolbar>
  );
}

export function AgentWorkflowEdit() {
  return (
    <Edit>
      <TabbedForm toolbar={<EditToolbar />}>
        <FormTab label="General">
          <TextInput source="name" validate={required()} fullWidth />
          <TextInput source="slug" disabled fullWidth />
          <TextInput source="description" fullWidth multiline rows={2} />
          <NumberInput source="agentId" label="Agent ID" />
          <SelectInput source="status" choices={statusChoices} />
          <NumberInput source="version" disabled />

          {/* Provenance info */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Provenance information is shown here when a workflow is cloned from another or created from a template.
            </Typography>
          </Box>
        </FormTab>

        <FormTab label="Definition">
          <DefinitionField />
        </FormTab>

        <FormTab label="Agent Config">
          <AgentConfigField />
        </FormTab>
      </TabbedForm>
    </Edit>
  );
}
