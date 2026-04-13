'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  TextField,
  BooleanField,
  DateField,
  FunctionField,
  ReferenceField,
  ReferenceManyField,
  Datagrid,
} from 'react-admin';
import { Box, Typography, Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  escalated: 'warning',
  closed: 'default',
};

export default function ChannelShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <ReferenceField source="tenantId" reference="tenants" label="Tenant">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="channelType" label="Channel Type" />
        <TextField source="adapterName" label="Adapter" />
        <TextField source="name" label="Name" />
        <BooleanField source="enabled" label="Enabled" />
        <FunctionField
          label="Config"
          render={(record: { config?: Record<string, unknown> }) => (
            <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {JSON.stringify(record.config, null, 2)}
            </Box>
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h6">Recent Conversations</Typography>
        </Box>
        <ReferenceManyField label="" reference="notification-conversations" target="channelId">
          <Datagrid bulkActionButtons={false} rowClick="show">
            <NumberField source="id" label="ID" />
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
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
