'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const executionFilters = [
  <TextInput key="model" source="model" label="Model" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    label="Type"
    choices={[
      { id: 'text', name: 'Text' },
      { id: 'embedding', name: 'Embedding' },
      { id: 'image', name: 'Image' },
      { id: 'structured-output', name: 'Structured Output' },
    ]}
    alwaysOn
  />,
  <SelectInput
    key="status"
    source="status"
    label="Status"
    choices={[
      { id: 'completed', name: 'Completed' },
      { id: 'failed', name: 'Failed' },
    ]}
    alwaysOn
  />,
];

const statusColors: Record<string, 'success' | 'error' | 'default'> = {
  completed: 'success',
  failed: 'error',
};

const typeColors: Record<string, 'primary' | 'secondary' | 'info' | 'warning'> = {
  text: 'primary',
  embedding: 'secondary',
  image: 'info',
  'structured-output': 'warning',
};

export default function PlaygroundExecutionList() {
  return (
    <List filters={executionFilters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="show">
        <TextField source="id" />
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip
              label={record.type}
              size="small"
              color={typeColors[record.type] ?? 'default'}
            />
          )}
        />
        <TextField source="model" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record.status}
              size="small"
              color={statusColors[record.status] ?? 'default'}
            />
          )}
        />
        <FunctionField
          label="Cost"
          render={(record: any) =>
            record.costCents != null ? `$${(record.costCents / 100).toFixed(2)}` : '-'
          }
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
}
