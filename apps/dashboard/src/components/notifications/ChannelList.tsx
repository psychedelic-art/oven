'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  BooleanField,
  DateField,
  TextInput,
  SelectInput,
  ReferenceField,
} from 'react-admin';

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
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <ReferenceField source="tenantId" reference="tenants" label="Tenant">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="channelType" label="Channel" />
        <TextField source="adapterName" label="Adapter" />
        <TextField source="name" label="Name" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
