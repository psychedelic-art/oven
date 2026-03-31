'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  NumberInput,
  SelectInput,
  TextInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const statusColors: Record<string, 'info' | 'success' | 'error' | 'warning'> = {
  active: 'info',
  completed: 'success',
  cancelled: 'error',
  paused: 'warning',
};

const flowItemFilters = [
  <NumberInput key="flowId" source="flowId" label="Flow ID" />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'active', name: 'Active' },
      { id: 'completed', name: 'Completed' },
      { id: 'cancelled', name: 'Cancelled' },
      { id: 'paused', name: 'Paused' },
    ]}
  />,
  <TextInput key="contentType" source="contentType" label="Content Type" />,
  <NumberInput key="tenantId" source="tenantId" label="Tenant ID" />,
];

export default function FlowItemList() {
  return (
    <List filters={flowItemFilters}>
      <Datagrid rowClick="show">
        <NumberField source="id" />
        <NumberField source="flowId" label="Flow ID" />
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
        <NumberField source="createdBy" label="Created By" />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="updatedAt" label="Updated At" showTime />
      </Datagrid>
    </List>
  );
}
