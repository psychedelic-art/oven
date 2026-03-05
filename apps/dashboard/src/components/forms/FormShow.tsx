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
import { Chip, Box, Typography } from '@mui/material';

export default function FormShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={
                record?.status === 'published'
                  ? 'success'
                  : record?.status === 'archived'
                    ? 'warning'
                    : 'default'
              }
            />
          )}
        />
        <NumberField source="version" label="Version" />
        <NumberField source="tenantId" label="Tenant ID" />
        <NumberField source="createdBy" label="Created By" />
        <FunctionField
          label="Definition"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.definition ? JSON.stringify(record.definition, null, 2) : '—'}
            </Box>
          )}
        />
        <FunctionField
          label="Data Layer Config"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.dataLayerConfig ? JSON.stringify(record.dataLayerConfig, null, 2) : '—'}
            </Box>
          )}
        />
        <FunctionField
          label="Business Layer Config"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.businessLayerConfig ? JSON.stringify(record.businessLayerConfig, null, 2) : '—'}
            </Box>
          )}
        />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography variant="h6">Submissions</Typography>
        </Box>
        <ReferenceManyField
          label=""
          reference="form-submissions"
          target="formId"
        >
          <Datagrid bulkActionButtons={false}>
            <NumberField source="id" label="ID" />
            <NumberField source="submittedBy" label="Submitted By" />
            <DateField source="submittedAt" label="Submitted At" showTime />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
