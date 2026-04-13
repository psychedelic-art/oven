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
  NumberInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  escalated: 'warning',
  closed: 'default',
};

const filters = [
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'escalated', name: 'Escalated' },
      { id: 'closed', name: 'Closed' },
    ]}
  />,
  <SelectInput
    key="channelType"
    source="channelType"
    label="Channel Type"
    choices={[
      { id: 'whatsapp', name: 'WhatsApp' },
      { id: 'sms', name: 'SMS' },
      { id: 'email', name: 'Email' },
    ]}
  />,
];

export default function ConversationList() {
  return (
    <List filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <ReferenceField source="tenantId" reference="tenants" label="Tenant">
          <TextField source="name" />
        </ReferenceField>
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
