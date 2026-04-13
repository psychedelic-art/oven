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

function BillingPlanListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function BillingPlanList() {
  return (
    <List actions={<BillingPlanListToolbar />} sort={{ field: 'order', order: 'ASC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <NumberField source="price" label="Price (cents)" />
        <TextField source="currency" label="Currency" />
        <TextField source="billingCycle" label="Cycle" />
        <FunctionField
          label="Public"
          render={(record: any) => (
            <Chip label={record?.isPublic ? 'Yes' : 'No'} size="small" color={record?.isPublic ? 'info' : 'default'} />
          )}
        />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip label={record?.enabled ? 'Enabled' : 'Disabled'} size="small" color={record?.enabled ? 'success' : 'default'} />
          )}
        />
        <NumberField source="order" label="Order" />
      </Datagrid>
    </List>
  );
}
