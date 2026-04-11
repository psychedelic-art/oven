'use client';

import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  ReferenceField, SelectInput, NumberInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <NumberInput key="agentId" source="agentId" label="Agent ID" />,
  <SelectInput key="status" source="status" label="Status" choices={[
    { id: 'active', name: 'Active' },
    { id: 'archived', name: 'Archived' },
  ]} />,
];

export default function SessionList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="agentId" label="Agent" />
        <NumberField source="userId" label="User" />
        <TextField source="status" label="Status" />
        <BooleanField source="isPlayground" label="Playground" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
