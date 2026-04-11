'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  TextInput,
  BooleanInput,
  SelectInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip } from '@mui/material';

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

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="type" source="type" label="Type" choices={providerTypeChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function ProviderList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
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
