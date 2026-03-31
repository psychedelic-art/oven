'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  ReferenceField,
  TextInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <ReferenceInput key="categoryId" source="categoryId" reference="service-categories" label="Category">
    <SelectInput optionText="name" />
  </ReferenceInput>,
];

export default function ServiceList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <ReferenceField source="categoryId" reference="service-categories" label="Category">
          <TextField source="name" />
        </ReferenceField>
        <TextField source="unit" label="Unit" />
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
