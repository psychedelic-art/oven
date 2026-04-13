'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  DeleteButton,
  useListContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search content', kind: 'quick-search', alwaysOn: true },
  { source: 'key', label: 'Memory Key', kind: 'combo', choices: [] },
];

function AgentMemoryListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function AgentMemoryList() {
  return (
    <List actions={<AgentMemoryListToolbar />} sort={{ field: 'updatedAt', order: 'DESC' }} emptyWhileLoading>
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <FunctionField
          label="Key"
          render={(record: Record<string, unknown>) => (
            <Chip label={record.key as string} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
          )}
        />
        <FunctionField
          label="Content"
          render={(record: Record<string, unknown>) => (
            <Box sx={{ maxWidth: 400, fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(record.content as string)?.slice(0, 120)}
            </Box>
          )}
        />
        <NumberField source="agentId" label="Agent" />
        <DateField source="updatedAt" showTime />
        <DeleteButton />
      </Datagrid>
    </List>
  );
}
