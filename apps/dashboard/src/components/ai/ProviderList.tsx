'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  EditButton,
  DeleteButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const providerTypeChoices = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google' },
  { id: 'custom', name: 'Custom' },
];

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'default'> = {
  openai: 'primary',
  anthropic: 'secondary',
  google: 'success',
  custom: 'default',
};

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'type', label: 'Type', kind: 'status', choices: providerTypeChoices },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function ProviderListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ProviderList() {
  return (
    <List actions={<ProviderListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip
              label={record?.type}
              size="small"
              color={typeColors[record?.type] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <TextField source="defaultModel" label="Default Model" />
        <FunctionField
          label="API Key"
          render={(record: any) => (
            <Chip
              label={record?.hasApiKey ? 'Connected' : 'No Key'}
              size="small"
              color={record?.hasApiKey ? 'success' : 'warning'}
              variant={record?.hasApiKey ? 'filled' : 'outlined'}
            />
          )}
        />
        <NumberField source="rateLimitRpm" label="RPM Limit" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
