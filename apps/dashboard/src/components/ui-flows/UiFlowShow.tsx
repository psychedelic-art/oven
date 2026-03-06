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
import { Chip } from '@mui/material';

const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  draft: 'info',
  published: 'success',
  archived: 'default',
};

export default function UiFlowShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <TextField source="name" />
        <TextField source="slug" />
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
        <NumberField source="version" />
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
        <TextField source="description" />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="createdAt" label="Created At" showTime />
        <DateField source="updatedAt" label="Updated At" showTime />

        <ReferenceManyField
          label="Pages"
          reference="ui-flow-pages"
          target="uiFlowId"
        >
          <Datagrid>
            <TextField source="slug" />
            <TextField source="title" />
            <FunctionField
              source="pageType"
              label="Type"
              render={(record: { pageType: string }) => (
                <Chip label={record.pageType} size="small" variant="outlined" />
              )}
            />
            <NumberField source="position" />
            <FunctionField
              source="enabled"
              label="Enabled"
              render={(record: { enabled: boolean }) =>
                record.enabled ? (
                  <Chip label="Yes" color="success" size="small" />
                ) : (
                  <Chip label="No" size="small" />
                )
              }
            />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
