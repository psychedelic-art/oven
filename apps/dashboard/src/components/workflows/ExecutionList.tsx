'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const statusColors: Record<string, any> = {
  completed: 'success',
  running: 'warning',
  failed: 'error',
  cancelled: 'default',
  pending: 'info',
};

const filters = [
  <TextInput key="workflowId" source="workflowId" label="Workflow ID" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'pending', name: 'Pending' },
      { id: 'running', name: 'Running' },
      { id: 'completed', name: 'Completed' },
      { id: 'failed', name: 'Failed' },
      { id: 'cancelled', name: 'Cancelled' },
    ]}
  />,
];

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Running...';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ExecutionList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="workflowId" label="Workflow" />
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
        <TextField source="currentState" label="Current State" />
        <FunctionField
          label="Trigger"
          render={(record: any) =>
            record?.triggerEvent ? (
              <Chip
                label={record.triggerEvent}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            ) : '-'
          }
        />
        <FunctionField
          label="Duration"
          render={(record: any) =>
            formatDuration(record?.startedAt, record?.completedAt)
          }
        />
        <DateField source="startedAt" label="Started" showTime />
        <FunctionField
          label="Error"
          render={(record: any) =>
            record?.error ? (
              <Box
                sx={{
                  color: 'error.main',
                  fontSize: 12,
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {record.error}
              </Box>
            ) : null
          }
        />
      </Datagrid>
    </List>
  );
}
