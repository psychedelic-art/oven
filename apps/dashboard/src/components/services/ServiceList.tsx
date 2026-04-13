'use client';

import {
  List,
  Datagrid,
  NumberField,
  TextField,
  FunctionField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const referenceFilters = [
  <ReferenceInput key="categoryId" source="categoryId" reference="service-categories" label="Category">
    <SelectInput optionText="name" />
  </ReferenceInput>,
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
];

function ServiceListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function ServiceList() {
  return (
    <List filters={referenceFilters} actions={<ServiceListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
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
