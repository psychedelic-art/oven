'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import {
  resolveExecutionStatusColor,
  resolveExecutionTypeColor,
  formatCostCents,
  type PlaygroundExecutionRecord,
} from '@oven/module-ai/view/playground-execution-record';
import { TypedFunctionField } from './_fields/TypedFunctionField';

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

export default function PlaygroundExecutionList() {
  return (
    <List filters={executionFilters} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid rowClick="show">
        <TextField source="id" />
        <TypedFunctionField<PlaygroundExecutionRecord>
          label="Type"
          render={(record) => (
            <Chip
              label={record.type}
              size="small"
              color={resolveExecutionTypeColor(record.type)}
            />
          )}
        />
        <TextField source="model" />
        <TypedFunctionField<PlaygroundExecutionRecord>
          label="Status"
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={resolveExecutionStatusColor(record.status)}
            />
          )}
        />
        <TypedFunctionField<PlaygroundExecutionRecord>
          label="Cost"
          render={(record) => formatCostCents(record.costCents)}
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
}
