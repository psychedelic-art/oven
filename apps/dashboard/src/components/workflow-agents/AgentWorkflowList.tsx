'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  EditButton,
  TextInput,
  SelectInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
];

const statusColors: Record<string, 'default' | 'success' | 'warning'> = {
  draft: 'default',
  active: 'success',
  archived: 'warning',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="status" source="status" choices={statusChoices} />,
];

export function AgentWorkflowList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <TextField source="slug" />
        <FunctionField
          label="Status"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={record.status as string}
              color={statusColors[record.status as string] ?? 'default'}
              size="small"
              sx={{ textTransform: 'capitalize' }}
            />
          )}
        />
        <FunctionField
          label="Nodes"
          render={(record: Record<string, unknown>) => {
            const def = record?.definition as Record<string, unknown>;
            if (!def?.states) return '—';
            const count = Object.keys(def.states as Record<string, unknown>).length;
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {count} node{count !== 1 ? 's' : ''}
              </Box>
            );
          }}
        />
        <NumberField source="agentId" label="Agent" />
        <NumberField source="version" label="v" />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
