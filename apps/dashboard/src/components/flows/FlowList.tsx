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
  BooleanInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

const flowFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function FlowList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  const isAdminMode = useTenantContext((s) => s.isAdminMode);

  return (
    <List
      filters={flowFilters}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
    >
      <Datagrid rowClick="show">
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
        {isAdminMode && <ReferenceField source="tenantId" reference="tenants" label="Tenant" />}
        <DateField source="updatedAt" label="Updated At" showTime />
      </Datagrid>
    </List>
  );
}
