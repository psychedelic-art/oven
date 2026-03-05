'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  BooleanInput,
  NumberInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const flowFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function FlowList() {
  return (
    <List filters={flowFilters}>
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
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="updatedAt" label="Updated At" showTime />
      </Datagrid>
    </List>
  );
}
