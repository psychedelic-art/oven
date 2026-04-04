'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  SelectInput,
  BooleanInput,
  EditButton,
} from 'react-admin';
import { Chip } from '@mui/material';

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

const filters = [
  <SelectInput key="scope" source="scope" label="Scope" choices={scopeChoices} alwaysOn />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function BudgetList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
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
