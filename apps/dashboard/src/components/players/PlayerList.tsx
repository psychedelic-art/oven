'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success',
  banned: 'error',
  inactive: 'default',
};

const statusChoices = [
  { id: 'active', name: 'Active' },
  { id: 'banned', name: 'Banned' },
  { id: 'inactive', name: 'Inactive' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'status', label: 'Status', kind: 'status', choices: statusChoices, alwaysOn: true },
];

function formatPlayTime(seconds: number | null): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PlayerListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function PlayerList() {
  return (
    <List actions={<PlayerListToolbar />} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="username" />
        <TextField source="displayName" label="Display Name" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <FunctionField
          label="Play Time"
          render={(record: any) => formatPlayTime(record?.totalPlayTimeSeconds)}
        />
        <DateField source="lastSeenAt" label="Last Seen" emptyText="Never" />
        <DateField source="createdAt" label="Joined" />
      </Datagrid>
    </List>
  );
}
