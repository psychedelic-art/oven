'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  EditButton,
  DeleteButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function KnowledgeBaseListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function KnowledgeBaseList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<KnowledgeBaseListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'name', order: 'ASC' }}
    >
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
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="updatedAt" label="Updated" showTime />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
