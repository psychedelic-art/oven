'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  NumberField,
  useRecordContext,
} from 'react-admin';
import { Box, Typography, Chip, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useNavigate } from 'react-router-dom';

function WorkflowEditToolbar() {
  const record = useRecordContext();
  const navigate = useNavigate();

  if (!record) return null;

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <Button
        variant="outlined"
        startIcon={<EditNoteIcon />}
        onClick={() => navigate(`/workflows/${record.id}/editor`)}
        size="small"
      >
        Visual Editor
      </Button>
      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={async () => {
          try {
            const response = await fetch(`/api/workflows/${record.id}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            const result = await response.json();
            if (result.executionId) {
              navigate(`/workflow-executions/${result.executionId}/show`);
            }
          } catch (err) {
            console.error('Failed to execute workflow:', err);
          }
        }}
        size="small"
        color="success"
      >
        Execute
      </Button>
    </Box>
  );
}

function DefinitionPreview() {
  const record = useRecordContext();
  if (!record?.definition) return null;

  const def = record.definition as any;
  const states = def.states ? Object.keys(def.states) : [];

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        States ({states.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {states.map((s: string) => (
          <Chip
            key={s}
            label={s}
            size="small"
            color={s === def.initial ? 'primary' : 'default'}
            variant={def.states[s]?.type === 'final' ? 'filled' : 'outlined'}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Version {record.version} &middot; Initial: {def.initial}
      </Typography>
    </Box>
  );
}

export default function WorkflowEdit() {
  return (
    <Edit>
      <WorkflowEditToolbar />
      <SimpleForm>
        <TextInput source="name" label="Workflow Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" fullWidth />
        <TextInput source="description" label="Description" multiline rows={3} fullWidth />
        <TextInput
          source="triggerEvent"
          label="Trigger Event"
          helperText="Event that auto-starts this workflow. Leave empty for manual-only."
          fullWidth
        />
        <BooleanInput source="enabled" label="Enabled" />
        <DefinitionPreview />
      </SimpleForm>
    </Edit>
  );
}
