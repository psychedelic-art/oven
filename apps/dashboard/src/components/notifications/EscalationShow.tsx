'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  ReferenceField,
} from 'react-admin';
import { Chip } from '@mui/material';

const reasonColors: Record<string, 'warning' | 'error' | 'info' | 'default'> = {
  'out-of-scope': 'warning',
  clinical: 'error',
  'user-requested': 'info',
  'limit-exceeded': 'default',
};

const statusColors: Record<string, 'warning' | 'success' | 'default'> = {
  pending: 'warning',
  resolved: 'success',
};

export default function EscalationShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <ReferenceField source="tenantId" reference="tenants" label="Tenant">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="channelType" label="Channel Type" />
        <NumberField source="conversationId" label="Conversation ID" />
        <FunctionField
          label="Reason"
          render={(record: { reason?: string }) => (
            <Chip
              label={record.reason}
              size="small"
              color={reasonColors[record.reason ?? ''] ?? 'default'}
            />
          )}
        />
        <TextField source="userMessage" label="User Message" />
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
        <NumberField source="resolvedBy" label="Resolved By" />
        <DateField source="resolvedAt" label="Resolved At" showTime />
        <DateField source="createdAt" label="Created" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
