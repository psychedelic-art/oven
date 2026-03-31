'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  TextInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export default function ServiceCategoryList() {
  return (
    <List filters={filters} sort={{ field: 'order', order: 'ASC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="icon" label="Icon" />
        <NumberField source="order" label="Order" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.enabled ? 'Enabled' : 'Disabled'}
              size="small"
              color={record?.enabled ? 'success' : 'default'}
            />
          )}
        />
      </Datagrid>
    </List>
  );
}
