'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  BooleanField,
  DateField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const channelTypeChoices = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'sms', name: 'SMS' },
  { id: 'email', name: 'Email' },
];

const enabledChoices = [
  { id: 'true', name: 'Yes' },
  { id: 'false', name: 'No' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'channelType', label: 'Channel Type', kind: 'status', choices: channelTypeChoices },
  { source: 'enabled', label: 'Enabled', kind: 'combo', choices: enabledChoices },
];

function ChannelListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ChannelList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      actions={<ChannelListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <TextField source="channelType" label="Channel" />
        <TextField source="adapterName" label="Adapter" />
        <TextField source="name" label="Name" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
