'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusColors: Record<string, 'info' | 'success' | 'default'> = {
  draft: 'info',
  published: 'success',
  archived: 'default',
};

const uiFlowFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'draft', name: 'Draft' },
      { id: 'published', name: 'Published' },
      { id: 'archived', name: 'Archived' },
    ]}
  />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function UiFlowList() {
  return (
    <List filters={uiFlowFilters}>
      <Datagrid rowClick="show">
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
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
