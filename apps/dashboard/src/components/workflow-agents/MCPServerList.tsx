'use client';

import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

export function MCPServerList() {
  return (
    <List sort={{ field: 'updatedAt', order: 'DESC' }} emptyWhileLoading>
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Slug"
          render={(record: Record<string, unknown>) => (
            <Chip label={record.slug as string} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} variant="outlined" />
          )}
        />
        <TextField source="description" />
        <NumberField source="workflowId" label="Workflow" />
        <FunctionField
          label="Tools"
          render={(record: Record<string, unknown>) => {
            const tools = record.toolDefinitions as unknown[];
            return tools ? `${tools.length} tool${tools.length !== 1 ? 's' : ''}` : '—';
          }}
        />
        <BooleanField source="enabled" />
        <DateField source="updatedAt" showTime />
      </Datagrid>
    </List>
  );
}
