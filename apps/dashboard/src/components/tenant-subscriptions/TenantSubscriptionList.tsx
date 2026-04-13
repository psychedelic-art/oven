'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  cancelled: 'error',
  expired: 'default',
};

const filters = [
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'trial', name: 'Trial' },
      { id: 'past_due', name: 'Past Due' },
      { id: 'cancelled', name: 'Cancelled' },
      { id: 'expired', name: 'Expired' },
    ]}
  />,
];

export default function TenantSubscriptionList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <ReferenceField source="planId" reference="billing-plans" label="Plan">
          <TextField source="name" />
        </ReferenceField>
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={statusColors[record?.status] || 'default'}
            />
          )}
        />
        <DateField source="startsAt" label="Start Date" />
        <DateField source="expiresAt" label="Expires" />
      </Datagrid>
    </List>
  );
}
