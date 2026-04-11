'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  DateInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  success: 'success',
  error: 'error',
  timeout: 'warning',
};

const filters = [
  <TextInput key="tenantId" source="tenantId" label="Tenant ID" alwaysOn />,
  <TextInput key="providerId" source="providerId" label="Provider ID" />,
  <TextInput key="modelId" source="modelId" label="Model ID" />,
  <DateInput key="startDate" source="startDate" label="Start Date" />,
  <DateInput key="endDate" source="endDate" label="End Date" />,
];

export default function UsageLogList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      hasCreate={false}
    >
      <Datagrid bulkActionButtons={false}>
        <NumberField source="tenantId" label="Tenant" />
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
