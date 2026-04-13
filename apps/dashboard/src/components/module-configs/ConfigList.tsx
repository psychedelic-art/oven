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
import { Chip, Box } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const scopeChoices = [
  { id: 'module', name: 'Module Default' },
  { id: 'instance', name: 'Instance Override' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'moduleName', label: 'Module', kind: 'quick-search', alwaysOn: true },
  { source: 'scope', label: 'Scope', kind: 'status', choices: scopeChoices },
  { source: 'key', label: 'Config Key', kind: 'combo', choices: [] },
];

function ConfigListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ConfigList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<ConfigListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <FunctionField
          label="Module"
          render={(record: any) => (
            <Chip label={record?.moduleName} size="small" color="primary" variant="outlined" />
          )}
        />
        <FunctionField
          label="Scope"
          render={(record: any) => (
            <Chip
              label={record?.scope}
              size="small"
              color={record?.scope === 'instance' ? 'secondary' : 'default'}
            />
          )}
        />
        <TextField source="scopeId" label="Scope ID" />
        <TextField source="key" label="Key" />
        <FunctionField
          label="Value"
          render={(record: any) => (
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {JSON.stringify(record?.value)}
            </Box>
          )}
        />
        <TextField source="description" label="Description" />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
