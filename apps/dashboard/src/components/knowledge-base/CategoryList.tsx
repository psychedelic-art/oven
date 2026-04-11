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
  ReferenceInput,
  ReferenceField,
  AutocompleteInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <ReferenceInput key="knowledgeBaseId" source="knowledgeBaseId" reference="kb-knowledge-bases" alwaysOn>
    <AutocompleteInput optionText="name" label="Knowledge Base" />
  </ReferenceInput>,
  <ReferenceInput key="tenantId" source="tenantId" reference="tenants">
    <AutocompleteInput optionText="name" label="Tenant" />
  </ReferenceInput>,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function CategoryList() {
  return (
    <List filters={filters} sort={{ field: 'order', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <ReferenceField source="knowledgeBaseId" reference="kb-knowledge-bases" label="KB" link={false}>
          <TextField source="name" />
        </ReferenceField>
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
        <NumberField source="order" label="Order" />
        <BooleanField source="enabled" label="Enabled" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
