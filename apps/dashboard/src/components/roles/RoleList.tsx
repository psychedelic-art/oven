'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  BooleanField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const enabledChoices = [
  { id: true, name: 'Enabled' },
  { id: false, name: 'Disabled' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'combo', choices: enabledChoices },
];

function RoleListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function RoleList() {
  return (
    <List actions={<RoleListToolbar />} sort={{ field: 'id', order: 'ASC' }}>
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
