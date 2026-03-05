'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Box } from '@mui/material';

export default function FormSubmissionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <NumberField source="formId" label="Form ID" />
        <NumberField source="formVersion" label="Form Version" />
        <NumberField source="submittedBy" label="Submitted By" />
        <DateField source="submittedAt" label="Submitted At" showTime />
        <NumberField source="tenantId" label="Tenant ID" />
        <FunctionField
          label="Data"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.data ? JSON.stringify(record.data, null, 2) : '—'}
            </Box>
          )}
        />
        <FunctionField
          label="Metadata"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {record?.metadata ? JSON.stringify(record.metadata, null, 2) : '—'}
            </Box>
          )}
        />
      </SimpleShowLayout>
    </Show>
  );
}
