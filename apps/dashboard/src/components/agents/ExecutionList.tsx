'use client';

import {
  List, Datagrid, TextField, NumberField, DateField,
  FunctionField, useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  completed: 'success',
  running: 'warning',
  failed: 'error',
};

const statusFilterChoices = [
  { id: 'running', name: 'Running' },
  { id: 'completed', name: 'Completed' },
  { id: 'failed', name: 'Failed' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'agentId', label: 'Agent ID', kind: 'combo', choices: [] },
  { source: 'status', label: 'Status', kind: 'status', choices: statusFilterChoices },
];

function ExecutionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ExecutionList() {
  return (
    <List actions={<ExecutionListToolbar />} sort={{ field: 'startedAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="agentId" label="Agent" />
        <NumberField source="sessionId" label="Session" />
        <FunctionField
          label="Status"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={record?.status as string}
              size="small"
              color={statusColors[record?.status as string] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <FunctionField
          label="Tokens"
          render={(record: Record<string, unknown>) => {
            const usage = record?.tokenUsage as Record<string, number> | null;
            return usage ? `${usage.total ?? 0}` : '—';
          }}
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="startedAt" label="Started" showTime />
      </Datagrid>
    </List>
  );
}
