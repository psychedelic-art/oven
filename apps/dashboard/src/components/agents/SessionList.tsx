'use client';

import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  ReferenceField, useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusChoices = [
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'agentId', label: 'Agent ID', kind: 'combo', choices: [] },
  { source: 'status', label: 'Status', kind: 'status', choices: statusChoices },
];

function SessionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function SessionList() {
  return (
    <List actions={<SessionListToolbar />} sort={{ field: 'updatedAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="agentId" label="Agent" />
        <NumberField source="userId" label="User" />
        <TextField source="status" label="Status" />
        <BooleanField source="isPlayground" label="Playground" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
