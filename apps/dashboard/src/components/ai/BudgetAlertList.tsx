'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const typeColors: Record<string, 'warning' | 'error'> = {
  warning: 'warning',
  exceeded: 'error',
};

const typeChoices = [
  { id: 'warning', name: 'Warning' },
  { id: 'exceeded', name: 'Exceeded' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'budgetId', label: 'Budget ID', kind: 'quick-search', alwaysOn: true },
  { source: 'type', label: 'Type', kind: 'status', choices: typeChoices },
];

function BudgetAlertListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function BudgetAlertList() {
  return (
    <List
      actions={<BudgetAlertListToolbar />}
      sort={{ field: 'createdAt', order: 'DESC' }}
      hasCreate={false}
    >
      <Datagrid bulkActionButtons={false}>
        <NumberField source="budgetId" label="Budget ID" />
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip
              label={record?.type}
              size="small"
              color={typeColors[record?.type] ?? 'default'}
            />
          )}
        />
        <TextField source="message" label="Message" />
        <BooleanField source="acknowledged" label="Acknowledged" />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  );
}
