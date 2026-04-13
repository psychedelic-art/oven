'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  BooleanField,
  DateField,
  ReferenceField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const channelTypeChoices = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'sms', name: 'SMS' },
  { id: 'email', name: 'Email' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="channelType"
    source="channelType"
    label="Channel Type"
    choices={channelTypeChoices}
  />,
  <SelectInput
    key="enabled"
    source="enabled"
    label="Enabled"
    choices={[
      { id: 'true', name: 'Yes' },
      { id: 'false', name: 'No' },
    ]}
  />,
];

export default function ChannelList() {
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
        <TextField source="channelType" label="Channel" />
        <TextField source="adapterName" label="Adapter" />
        <TextField source="name" label="Name" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
