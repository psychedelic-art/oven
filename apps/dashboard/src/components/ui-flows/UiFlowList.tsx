'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

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
];

export default function UiFlowList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={uiFlowFilters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
    >
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
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
