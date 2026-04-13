'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceInput,
  ReferenceField,
  AutocompleteInput,
  EditButton,
  DeleteButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const referenceFilters = [
  <ReferenceInput key="knowledgeBaseId" source="knowledgeBaseId" reference="kb-knowledge-bases" alwaysOn>
    <AutocompleteInput optionText="name" label="Knowledge Base" />
  </ReferenceInput>,
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function CategoryListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function CategoryList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={referenceFilters}
      actions={<CategoryListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'order', order: 'ASC' }}
    >
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
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
