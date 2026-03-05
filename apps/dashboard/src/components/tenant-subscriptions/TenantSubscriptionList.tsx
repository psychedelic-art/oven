'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
  NumberInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  cancelled: 'error',
  expired: 'default',
};

const filters = [
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" alwaysOn />,
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
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="tenantId" label="Tenant ID" />
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
