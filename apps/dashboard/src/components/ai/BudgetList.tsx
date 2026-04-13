'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  EditButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const scopeChoices = [
  { id: 'global', name: 'Global' },
  { id: 'tenant', name: 'Tenant' },
  { id: 'agent', name: 'Agent' },
  { id: 'provider', name: 'Provider' },
];

const scopeColors: Record<string, 'secondary' | 'primary' | 'success' | 'warning'> = {
  global: 'secondary',
  tenant: 'primary',
  agent: 'success',
  provider: 'warning',
};

const filterDefinitions: FilterDefinition[] = [
  { source: 'scope', label: 'Scope', kind: 'status', choices: scopeChoices, alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function BudgetListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function BudgetList() {
  return (
    <List actions={<BudgetListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <FunctionField
          label="Scope"
          render={(record: any) => (
            <Chip
              label={record?.scope}
              size="small"
              color={scopeColors[record?.scope] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <TextField source="scopeId" label="Scope ID" />
        <FunctionField
          label="Period"
          render={(record: any) => (
            <Chip label={record?.periodType} size="small" variant="outlined" />
          )}
        />
        <NumberField source="tokenLimit" label="Token Limit" />
        <FunctionField
          label="Cost Limit"
          render={(record: any) => {
            const cents = record?.costLimitCents;
            if (cents == null) return '-';
            return `$${(cents / 100).toFixed(2)}`;
          }}
        />
        <NumberField source="alertThresholdPct" label="Alert %" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
