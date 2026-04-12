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
import {
  type PlaygroundExecutionRecord,
  resolveStatusColor,
  resolveTypeColor,
  formatCostCents,
} from '@oven/module-ai/view/playground-execution-record';

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
        <FunctionField<PlaygroundExecutionRecord>
          label="Type"
          render={(record) => (
            <Chip
              label={record?.type}
              size="small"
              color={resolveTypeColor(record?.type)}
            />
          )}
        />
        <TextField source="model" />
        <FunctionField<PlaygroundExecutionRecord>
          label="Status"
          render={(record) => (
            <Chip
              label={record?.status}
              size="small"
              color={resolveStatusColor(record?.status)}
            />
          )}
        />
        <FunctionField<PlaygroundExecutionRecord>
          label="Cost"
          render={(record) => formatCostCents(record?.costCents)}
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="createdAt" showTime />
      </Datagrid>
    </List>
  );
}
