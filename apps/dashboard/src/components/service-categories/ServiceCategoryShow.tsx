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
} from 'react-admin';
import { Chip, Typography, Box } from '@mui/material';

export default function ServiceCategoryShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="description" label="Description" />
        <TextField source="icon" label="Icon" />
        <NumberField source="order" label="Sort Order" />
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
          <Typography variant="h6">Services in this Category</Typography>
        </Box>
        <ReferenceManyField label="" reference="services" target="categoryId">
          <Datagrid bulkActionButtons={false} rowClick="edit">
            <NumberField source="id" label="ID" />
            <TextField source="name" label="Name" />
            <TextField source="slug" label="Slug" />
            <TextField source="unit" label="Unit" />
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
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
