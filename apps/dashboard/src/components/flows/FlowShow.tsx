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
import { Chip, Box } from '@mui/material';

const statusColors: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
  active: 'info',
  completed: 'success',
  cancelled: 'error',
  paused: 'warning',
};

export default function FlowShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <TextField source="name" />
        <TextField source="slug" />
        <FunctionField
          source="enabled"
          label="Enabled"
          render={(record: { enabled: boolean }) =>
            record.enabled ? (
              <Chip label="Active" color="success" size="small" />
            ) : (
              <Chip label="Disabled" size="small" />
            )
          }
        />
        <NumberField source="version" />
        <NumberField source="tenantId" label="Tenant ID" />
        <TextField source="description" />
        <FunctionField
          source="definition"
          label="Definition (JSON)"
          render={(record: { definition: unknown }) => (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {typeof record.definition === 'string'
                ? record.definition
                : JSON.stringify(record.definition, null, 2)}
            </pre>
          )}
        />
        <DateField source="createdAt" label="Created At" showTime />
        <DateField source="updatedAt" label="Updated At" showTime />

        <ReferenceManyField
          label="Flow Items"
          reference="flow-items"
          target="flowId"
        >
          <Datagrid rowClick="show">
            <NumberField source="id" />
            <TextField source="contentType" label="Content Type" />
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
            <DateField source="createdAt" label="Created At" showTime />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
