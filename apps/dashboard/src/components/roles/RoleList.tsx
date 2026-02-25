'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  FunctionField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="enabled"
    source="enabled"
    choices={[
      { id: true, name: 'Enabled' },
      { id: false, name: 'Disabled' },
    ]}
  />,
];

export default function RoleList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="description" />
        <FunctionField
          label="Type"
          render={(record: any) =>
            record?.isSystem ? (
              <Chip label="System" size="small" color="primary" variant="outlined" />
            ) : (
              <Chip label="Custom" size="small" variant="outlined" />
            )
          }
        />
        <BooleanField source="enabled" />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
