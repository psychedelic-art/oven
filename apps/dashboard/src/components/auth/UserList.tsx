'use client';
import { List, Datagrid, NumberField, TextField, DateField, FunctionField, TextInput } from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <TextInput key="status" source="status" label="Status" />,
];

export default function UserList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="email" label="Email" />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => {
            const color =
              record.status === 'active'
                ? 'success'
                : record.status === 'suspended'
                  ? 'error'
                  : 'default';
            return <Chip label={record.status} color={color} size="small" />;
          }}
        />
        <DateField source="lastLoginAt" label="Last Login" showTime />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
