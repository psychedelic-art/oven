'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success',
  banned: 'error',
  inactive: 'default',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'banned', name: 'Banned' },
      { id: 'inactive', name: 'Inactive' },
    ]}
    alwaysOn
  />,
];

function formatPlayTime(seconds: number | null): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PlayerList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
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
