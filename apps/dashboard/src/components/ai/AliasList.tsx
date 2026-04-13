'use client';

import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  EditButton,
  DeleteButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
import { useTenantContext } from '@oven/dashboard-ui';

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

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  {
    source: 'type',
    label: 'Type',
    kind: 'combo',
    choices: typeChoices,
  },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function AliasListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function AliasList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <List
      actions={<AliasListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
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
