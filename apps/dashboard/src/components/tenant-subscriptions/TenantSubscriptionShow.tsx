'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  ReferenceManyField,
  Datagrid,
  DeleteButton,
  CreateButton,
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  trial: 'info',
  past_due: 'warning',
  cancelled: 'error',
  expired: 'default',
};

export default function TenantSubscriptionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <NumberField source="tenantId" label="Tenant ID" />
        <ReferenceField source="planId" reference="billing-plans" label="Plan">
          <TextField source="name" />
        </ReferenceField>
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={statusColors[record?.status] || 'default'}
            />
          )}
        />
        <DateField source="startsAt" label="Start Date" showTime />
        <DateField source="expiresAt" label="Expires" showTime />
        <DateField source="trialEndsAt" label="Trial Ends" showTime />
        <DateField source="createdAt" label="Created" showTime />

        <Box sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Quota Overrides</Typography>
          <CreateButton resource="quota-overrides" label="Add Override" />
        </Box>
        <ReferenceManyField label="" reference="quota-overrides" target="subscriptionId">
          <Datagrid bulkActionButtons={false} rowClick="edit">
            <ReferenceField source="serviceId" reference="services" label="Service">
              <TextField source="name" />
            </ReferenceField>
            <NumberField source="quota" label="Override Quota" />
            <TextField source="reason" label="Reason" />
            <DateField source="createdAt" label="Created" />
            <DeleteButton redirect={false} />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
