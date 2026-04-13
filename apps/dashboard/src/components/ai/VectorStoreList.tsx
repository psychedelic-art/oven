'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  ReferenceField,
  EditButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
import {
  resolveAdapterColor,
  type VectorStoreRecord,
} from '@oven/module-ai/view/vector-store-record';
import { TypedFunctionField } from './_fields/TypedFunctionField';

const adapterChoices = [
  { id: 'pgvector', name: 'pgvector' },
  { id: 'pinecone', name: 'Pinecone' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'adapter', label: 'Adapter', kind: 'combo', choices: adapterChoices },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function VectorStoreListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function VectorStoreList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<VectorStoreListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <TypedFunctionField<VectorStoreRecord>
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
