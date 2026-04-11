'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusChoices = [
  { id: 'pending', name: 'Pending' },
  { id: 'running', name: 'Running' },
  { id: 'completed', name: 'Completed' },
  { id: 'failed', name: 'Failed' },
  { id: 'paused', name: 'Paused' },
  { id: 'cancelled', name: 'Cancelled' },
];

const statusColors: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'error',
  paused: 'warning',
  cancelled: 'default',
};

const filters = [
  <SelectInput key="status" source="status" choices={statusChoices} alwaysOn />,
];

export function AgentWorkflowExecutionList() {
  return (
    <List filters={filters} sort={{ field: 'startedAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="workflowId" label="Workflow" />
        <FunctionField
          label="Status"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={record.status as string}
              color={statusColors[record.status as string] ?? 'default'}
              size="small"
            />
          )}
        />
        <TextField source="currentState" label="Current Node" />
        <NumberField source="stepsExecuted" label="Steps" />
        <TextField source="triggerSource" label="Trigger" />
        <DateField source="startedAt" showTime />
        <DateField source="completedAt" showTime emptyText="—" />
        <FunctionField
          label="Error"
          render={(record: Record<string, unknown>) =>
            record.error ? <Chip label="Error" color="error" size="small" /> : '—'
          }
        />
      </Datagrid>
    </List>
  );
}
