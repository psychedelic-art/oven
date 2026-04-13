'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  DateInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  success: 'success',
  error: 'error',
  timeout: 'warning',
};

const filters = [
  <TextInput key="providerId" source="providerId" label="Provider ID" />,
  <TextInput key="modelId" source="modelId" label="Model ID" />,
  <DateInput key="startDate" source="startDate" label="Start Date" />,
  <DateInput key="endDate" source="endDate" label="End Date" />,
];

export default function UsageLogList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={filters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'createdAt', order: 'DESC' }}
      hasCreate={false}
    >
      <Datagrid bulkActionButtons={false}>
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <NumberField source="providerId" label="Provider" />
        <TextField source="modelId" label="Model" />
        <TextField source="toolName" label="Tool" />
        <NumberField source="inputTokens" label="In Tokens" />
        <NumberField source="outputTokens" label="Out Tokens" />
        <NumberField source="totalTokens" label="Total Tokens" />
        <FunctionField
          label="Cost"
          render={(record: any) => {
            const cents = record?.costCents;
            if (cents == null) return '-';
            return `$${(cents / 100).toFixed(4)}`;
          }}
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={statusColors[record?.status] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
