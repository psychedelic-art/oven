'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const typeColors: Record<string, 'warning' | 'error'> = {
  warning: 'warning',
  exceeded: 'error',
};

const typeChoices = [
  { id: 'warning', name: 'Warning' },
  { id: 'exceeded', name: 'Exceeded' },
];

const filters = [
  <TextInput key="budgetId" source="budgetId" label="Budget ID" alwaysOn />,
  <SelectInput key="type" source="type" label="Type" choices={typeChoices} />,
];

export default function BudgetAlertList() {
  return (
    <List
      filters={filters}
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
