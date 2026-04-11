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
  ReferenceInput,
  AutocompleteInput,
  BooleanInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <ReferenceInput key="tenantId" source="tenantId" reference="tenants" alwaysOn>
    <AutocompleteInput optionText="name" label="Tenant" />
  </ReferenceInput>,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function KnowledgeBaseList() {
  return (
    <List filters={filters} sort={{ field: 'name', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="description" label="Description" />
        <FunctionField
          label="Entries"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={String(record?.entryCount ?? 0)}
              size="small"
              variant="outlined"
              color={Number(record?.entryCount ?? 0) > 0 ? 'primary' : 'default'}
            />
          )}
        />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="updatedAt" label="Updated" showTime />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
