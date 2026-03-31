'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  DateField,
  FunctionField,
  TextInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <TextInput key="category" source="category" label="Category" />,
];

export default function FormComponentList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Category"
          render={(record: any) => (
            <Chip
              label={record?.category}
              size="small"
            />
          )}
        />
        <NumberField source="tenantId" label="Tenant ID" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
