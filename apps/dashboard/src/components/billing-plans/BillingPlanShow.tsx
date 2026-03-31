'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceManyField,
  Datagrid,
  ReferenceField,
  DeleteButton,
  CreateButton,
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';

export default function BillingPlanShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="description" label="Description" />
        <NumberField source="price" label="Price (cents)" />
        <TextField source="currency" label="Currency" />
        <TextField source="billingCycle" label="Billing Cycle" />
        <FunctionField
          label="Features"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.features ? JSON.stringify(record.features, null, 2) : '—'}
            </Box>
          )}
        />
        <FunctionField
          label="Public"
          render={(record: any) => (
            <Chip label={record?.isPublic ? 'Yes' : 'No'} size="small" color={record?.isPublic ? 'info' : 'default'} />
          )}
        />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip label={record?.enabled ? 'Enabled' : 'Disabled'} size="small" color={record?.enabled ? 'success' : 'default'} />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />

        <Box sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Plan Quotas</Typography>
          <CreateButton resource="plan-quotas" label="Add Quota" />
        </Box>
        <ReferenceManyField label="" reference="plan-quotas" target="planId">
          <Datagrid bulkActionButtons={false} rowClick="edit">
            <ReferenceField source="serviceId" reference="services" label="Service">
              <TextField source="name" />
            </ReferenceField>
            <NumberField source="quota" label="Quota" />
            <TextField source="period" label="Period" />
            <NumberField source="pricePerUnit" label="Overage Price/Unit" />
            <DeleteButton redirect={false} />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
