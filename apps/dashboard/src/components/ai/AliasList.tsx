'use client';

import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  SelectInput,
  BooleanInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip } from '@mui/material';

const typeChoices = [
  { id: 'text', name: 'Text' },
  { id: 'embedding', name: 'Embedding' },
  { id: 'image', name: 'Image' },
  { id: 'object', name: 'Object' },
];

const typeColors: Record<string, 'primary' | 'success' | 'secondary' | 'warning'> = {
  text: 'primary',
  embedding: 'success',
  image: 'secondary',
  object: 'warning',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="type" source="type" label="Type" choices={typeChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function AliasList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="alias" label="Alias" />
        <ReferenceField source="providerId" reference="ai-providers" label="Provider">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="modelId" label="Model ID" />
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
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
