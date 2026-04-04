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
  BooleanInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip, Typography } from '@mui/material';

const ruleTypeChoices = [
  { id: 'keyword', name: 'Keyword' },
  { id: 'regex', name: 'Regex' },
  { id: 'classifier', name: 'Classifier' },
];

const scopeChoices = [
  { id: 'input', name: 'Input' },
  { id: 'output', name: 'Output' },
  { id: 'both', name: 'Both' },
];

const actionColors: Record<string, 'error' | 'warning' | 'info'> = {
  block: 'error',
  warn: 'warning',
  modify: 'info',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="ruleType" source="ruleType" label="Rule Type" choices={ruleTypeChoices} />,
  <SelectInput key="scope" source="scope" label="Scope" choices={scopeChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function GuardrailList() {
  return (
    <List filters={filters} sort={{ field: 'priority', order: 'ASC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="name" label="Name" />
        <FunctionField
          label="Rule Type"
          render={(record: any) => (
            <Chip label={record?.ruleType} size="small" variant="outlined" />
          )}
        />
        <FunctionField
          label="Scope"
          render={(record: any) => (
            <Chip label={record?.scope} size="small" variant="outlined" />
          )}
        />
        <FunctionField
          label="Action"
          render={(record: any) => (
            <Chip
              label={record?.action}
              size="small"
              color={actionColors[record?.action] ?? 'default'}
            />
          )}
        />
        <FunctionField
          label="Pattern"
          render={(record: any) => {
            const pattern = record?.pattern;
            if (!pattern) return '-';
            const truncated = pattern.length > 40 ? `${pattern.slice(0, 40)}...` : pattern;
            return (
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12 }}
              >
                {truncated}
              </Typography>
            );
          }}
        />
        <NumberField source="priority" label="Priority" />
        <BooleanField source="enabled" label="Enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
