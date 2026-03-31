'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const statusColors: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
  active: 'info',
  completed: 'success',
  cancelled: 'error',
  paused: 'warning',
};

export default function FlowItemShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <NumberField source="flowId" label="Flow ID" />
        <NumberField source="currentStageId" label="Current Stage ID" />
        <TextField source="contentType" label="Content Type" />
        <NumberField source="contentId" label="Content ID" />
        <FunctionField
          source="status"
          label="Status"
          render={(record: { status: string }) => (
            <Chip
              label={record.status}
              color={statusColors[record.status] || 'default'}
              size="small"
            />
          )}
        />
        <NumberField source="assignedTo" label="Assigned To" />
        <NumberField source="createdBy" label="Created By" />
        <NumberField source="tenantId" label="Tenant ID" />
        <FunctionField
          source="contentSnapshot"
          label="Content Snapshot (JSON)"
          render={(record: { contentSnapshot: unknown }) => (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {typeof record.contentSnapshot === 'string'
                ? record.contentSnapshot
                : JSON.stringify(record.contentSnapshot, null, 2)}
            </pre>
          )}
        />
        <FunctionField
          source="metadata"
          label="Metadata (JSON)"
          render={(record: { metadata: unknown }) => (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {typeof record.metadata === 'string'
                ? record.metadata
                : JSON.stringify(record.metadata, null, 2)}
            </pre>
          )}
        />
        <DateField source="createdAt" label="Created At" showTime />
        <DateField source="updatedAt" label="Updated At" showTime />

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          Comments and reviews available via API
        </Box>
      </SimpleShowLayout>
    </Show>
  );
}
