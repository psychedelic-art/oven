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
  SelectInput,
  BooleanInput,
  EditButton,
} from 'react-admin';
import { Chip } from '@mui/material';
import {
  type VectorStoreRecord,
  resolveAdapterColor,
} from '@oven/module-ai/view/vector-store-record';

const adapterChoices = [
  { id: 'pgvector', name: 'pgvector' },
  { id: 'pinecone', name: 'Pinecone' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="adapter" source="adapter" label="Adapter" choices={adapterChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function VectorStoreList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <NumberField source="tenantId" label="Tenant" />
        <FunctionField<VectorStoreRecord>
          label="Adapter"
          render={(record) => (
            <Chip
              label={record?.adapter}
              size="small"
              color={resolveAdapterColor(record?.adapter)}
              variant="outlined"
            />
          )}
        />
        <TextField source="embeddingModel" label="Embedding Model" />
        <NumberField source="dimensions" label="Dimensions" />
        <NumberField source="documentCount" label="Documents" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
