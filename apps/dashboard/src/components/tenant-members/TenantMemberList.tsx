'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const roleChoices = [
  { id: 'owner', name: 'Owner' },
  { id: 'admin', name: 'Admin' },
  { id: 'member', name: 'Member' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'role', label: 'Role', kind: 'status', choices: roleChoices },
];

function TenantMemberListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function TenantMemberList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<TenantMemberListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <NumberField source="userId" label="User ID" />
        <FunctionField
          label="Role"
          render={(record: any) => (
            <Chip
              label={record?.role}
              size="small"
              color={record?.role === 'owner' ? 'primary' : record?.role === 'admin' ? 'secondary' : 'default'}
            />
          )}
        />
        <DateField source="joinedAt" label="Joined" showTime />
      </Datagrid>
    </List>
  );
}
