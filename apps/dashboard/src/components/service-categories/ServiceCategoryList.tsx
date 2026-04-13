'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
];

function ServiceCategoryListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ServiceCategoryList() {
  return (
    <List actions={<ServiceCategoryListToolbar />} sort={{ field: 'order', order: 'ASC' }}>
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
