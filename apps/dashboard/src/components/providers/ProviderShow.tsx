'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  UrlField,
  ReferenceManyField,
  Datagrid,
  ReferenceField,
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';

export default function ProviderShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="description" label="Description" />
        <UrlField source="website" label="Website" />
        <TextField source="logo" label="Logo URL" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.enabled ? 'Enabled' : 'Disabled'}
              size="small"
              color={record?.enabled ? 'success' : 'default'}
            />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h6">Services Offered</Typography>
        </Box>
        <ReferenceManyField label="" reference="provider-services" target="providerId">
          <Datagrid bulkActionButtons={false} rowClick="edit">
            <ReferenceField source="serviceId" reference="services" label="Service">
              <TextField source="name" />
            </ReferenceField>
            <NumberField source="costPerUnit" label="Cost/Unit" />
            <TextField source="currency" label="Currency" />
            <FunctionField
              label="Default"
              render={(record: any) => (
                <Chip label={record?.isDefault ? 'Yes' : 'No'} size="small" color={record?.isDefault ? 'primary' : 'default'} />
              )}
            />
            <FunctionField
              label="Status"
              render={(record: any) => (
                <Chip label={record?.enabled ? 'Enabled' : 'Disabled'} size="small" color={record?.enabled ? 'success' : 'default'} />
              )}
            />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
