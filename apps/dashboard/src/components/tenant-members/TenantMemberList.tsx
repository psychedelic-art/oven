'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const filters = [
  <SelectInput
    key="role"
    source="role"
    label="Role"
    choices={[
      { id: 'owner', name: 'Owner' },
      { id: 'admin', name: 'Admin' },
      { id: 'member', name: 'Member' },
    ]}
  />,
];

export default function TenantMemberList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
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
