'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  TextInput,
  SelectInput,
} from 'react-admin';

const RESOURCE_CHOICES = [
  { id: 'players', name: 'Players' },
  { id: 'maps', name: 'Maps' },
  { id: 'sessions', name: 'Sessions' },
  { id: 'tiles', name: 'Tiles' },
  { id: 'world-configs', name: 'World Configs' },
  { id: 'workflows', name: 'Workflows' },
  { id: 'roles', name: 'Roles' },
  { id: 'permissions', name: 'Permissions' },
  { id: 'rls-policies', name: 'RLS Policies' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="resource" source="resource" choices={RESOURCE_CHOICES} />,
];

export default function PermissionList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="slug" />
        <TextField source="resource" />
        <TextField source="action" />
        <TextField source="description" />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
