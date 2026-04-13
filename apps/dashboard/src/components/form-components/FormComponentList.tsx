'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'category', label: 'Category', kind: 'combo', choices: [] },
];

function FormComponentListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function FormComponentList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<FormComponentListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Category"
          render={(record: any) => (
            <Chip
              label={record?.category}
              size="small"
            />
          )}
        />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
