'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  useRecordContext,
  ReferenceManyField,
  Datagrid,
} from 'react-admin';
import { Box, Typography, Chip, Button, Paper } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useNavigate } from 'react-router-dom';

function WorkflowActions() {
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

function DefinitionDisplay() {
  const record = useRecordContext();
  if (!record?.definition) return null;

  const def = record.definition as any;
  const states = def.states ? Object.entries(def.states) : [];

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Workflow States
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {states.map(([name, state]: [string, any]) => (
          <Box
            key={name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: name === def.initial ? 'primary.50' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: name === def.initial ? 'primary.200' : 'grey.200',
            }}
          >
            <Chip
              label={name}
              size="small"
              color={name === def.initial ? 'primary' : 'default'}
              variant={state.type === 'final' ? 'filled' : 'outlined'}
            />
            {state.invoke && (
              <Chip
                label={state.invoke.src}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 10 }}
              />
            )}
            {state.type === 'final' && (
              <Typography variant="caption" color="success.main">
                FINAL
              </Typography>
            )}
            {state.on &&
              Object.entries(state.on).map(([evt, trans]: [string, any]) => (
                <Typography key={evt} variant="caption" color="text.secondary">
                  {evt} &rarr; {typeof trans === 'string' ? trans : (trans as any).target}
                </Typography>
              ))}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

const statusColors: Record<string, any> = {
  completed: 'success',
  running: 'warning',
  failed: 'error',
  cancelled: 'default',
  pending: 'info',
};

export default function WorkflowShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <WorkflowActions />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="description" />
        <FunctionField
          label="Trigger"
          render={(record: any) =>
            record?.triggerEvent ? (
              <Chip
                label={record.triggerEvent}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
            ) : (
              'Manual only'
            )
          }
        />
        <BooleanField source="enabled" />
        <NumberField source="version" />
        <DateField source="createdAt" showTime />
        <DateField source="updatedAt" showTime />
        <DefinitionDisplay />

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
          Recent Executions
        </Typography>
        <ReferenceManyField
          reference="workflow-executions"
          target="workflowId"
          sort={{ field: 'id', order: 'DESC' }}
          perPage={10}
        >
          <Datagrid rowClick="show" bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <FunctionField
              label="Status"
              render={(record: any) => (
                <Chip
                  label={record?.status}
                  size="small"
                  color={statusColors[record?.status] ?? 'default'}
                />
              )}
            />
            <TextField source="currentState" label="State" />
            <DateField source="startedAt" label="Started" showTime />
            <DateField source="completedAt" label="Finished" showTime />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
