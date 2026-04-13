'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  NumberInput,
  SelectInput,
  TextInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const statusColors: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
  active: 'info',
  completed: 'success',
  cancelled: 'error',
  paused: 'warning',
};

const flowItemFilters = [
  <NumberInput key="flowId" source="flowId" label="Flow ID" />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'completed', name: 'Completed' },
      { id: 'cancelled', name: 'Cancelled' },
      { id: 'paused', name: 'Paused' },
    ]}
  />,
  <TextInput key="contentType" source="contentType" label="Content Type" />,
];

export default function FlowItemList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={flowItemFilters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
    >
      <Datagrid rowClick="show">
        <NumberField source="id" />
        <NumberField source="flowId" label="Flow ID" />
        <TextField source="contentType" label="Content Type" />
        <FunctionField
          source="status"
          label="Status"
          render={(record: { status: string }) => (
            <Chip
              label={record.status}
              color={statusColors[record.status] || 'default'}
              size="small"
            />
          )}
        />
        <NumberField source="assignedTo" label="Assigned To" />
        <NumberField source="createdBy" label="Created By" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="updatedAt" label="Updated At" showTime />
      </Datagrid>
    </List>
  );
}
