'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  success: 'success',
  error: 'error',
  timeout: 'warning',
};

const filterDefinitions: FilterDefinition[] = [
  { source: 'providerId', label: 'Provider ID', kind: 'combo', choices: [] },
  { source: 'modelId', label: 'Model ID', kind: 'combo', choices: [] },
  { source: 'startDate', label: 'Start Date', kind: 'combo', choices: [] },
  { source: 'endDate', label: 'End Date', kind: 'combo', choices: [] },
];

function UsageLogListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function UsageLogList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<UsageLogListToolbar />}
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
