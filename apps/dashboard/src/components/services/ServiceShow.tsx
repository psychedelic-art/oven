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
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';

export default function ServiceShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <ReferenceField source="categoryId" reference="service-categories" label="Category">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="unit" label="Unit" />
        <TextField source="description" label="Description" />
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
          <Typography variant="h6">Provider Services</Typography>
        </Box>
        <ReferenceManyField label="" reference="provider-services" target="serviceId">
          <Datagrid bulkActionButtons={false} rowClick="edit">
            <ReferenceField source="providerId" reference="providers" label="Provider">
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
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
