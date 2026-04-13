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
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  escalated: 'warning',
  closed: 'default',
};

const statusChoices = [
  { id: 'active', name: 'Active' },
  { id: 'escalated', name: 'Escalated' },
  { id: 'closed', name: 'Closed' },
];

const channelTypeChoices = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'sms', name: 'SMS' },
  { id: 'email', name: 'Email' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'status', label: 'Status', kind: 'status', choices: statusChoices },
  { source: 'channelType', label: 'Channel Type', kind: 'status', choices: channelTypeChoices },
];

function ConversationListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ConversationList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<ConversationListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'createdAt', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <TextField source="channelType" label="Channel" />
        <TextField source="externalUserId" label="User" />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => (
            <Chip
              label={record.status}
              size="small"
              color={statusColors[record.status ?? ''] ?? 'default'}
            />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
