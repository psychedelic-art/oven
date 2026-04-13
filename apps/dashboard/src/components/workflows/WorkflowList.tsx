'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
  { source: 'triggerEvent', label: 'Trigger Event', kind: 'combo', choices: [] },
];

function WorkflowListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function WorkflowList() {
  return (
    <List actions={<WorkflowListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Trigger"
          render={(record: any) =>
            record?.triggerEvent ? (
              <Chip
                label={record.triggerEvent}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            ) : (
              <Chip label="Manual" size="small" variant="outlined" />
            )
          }
        />
        <FunctionField
          label="States"
          render={(record: any) => {
            const def = record?.definition;
            if (!def?.states) return '-';
            const count = Object.keys(def.states).length;
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {count} state{count !== 1 ? 's' : ''}
              </Box>
            );
          }}
        />
        <BooleanField source="enabled" label="Active" />
        <NumberField source="version" label="v" />
        <DateField source="updatedAt" label="Updated" showTime />
      </Datagrid>
    </List>
  );
}
