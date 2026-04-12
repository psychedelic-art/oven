'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  TextInput,
  SelectInput,
  BooleanInput,
  EditButton,
  DeleteButton,
} from 'react-admin';
import { Chip, Typography } from '@mui/material';
import {
  type GuardrailRecord,
  resolveGuardrailActionColor,
  truncateGuardrailPattern,
} from '@oven/module-ai/view/guardrail-record';
import { TypedFunctionField } from './_fields/TypedFunctionField';

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
        <TypedFunctionField<GuardrailRecord>
          label="Rule Type"
          render={(record) => (
            <Chip label={record?.ruleType} size="small" variant="outlined" />
          )}
        />
        <TypedFunctionField<GuardrailRecord>
          label="Scope"
          render={(record) => (
            <Chip label={record?.scope} size="small" variant="outlined" />
          )}
        />
        <TypedFunctionField<GuardrailRecord>
          label="Action"
          render={(record) => (
            <Chip
              label={record?.action}
              size="small"
              color={resolveGuardrailActionColor(record?.action)}
            />
          )}
        />
        <TypedFunctionField<GuardrailRecord>
          label="Pattern"
          render={(record) => {
            const truncated = truncateGuardrailPattern(record?.pattern);
            if (truncated === null) return '-';
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

