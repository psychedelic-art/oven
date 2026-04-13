import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  connected: 'success',
  disconnected: 'default',
  error: 'error',
  pending: 'warning',
};

const transportChoices = [
  { id: 'sse', name: 'SSE' },
  { id: 'http', name: 'HTTP' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'transport', label: 'Transport', kind: 'status', choices: transportChoices, alwaysOn: true },
];

function ChatMCPConnectionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatMCPConnectionList() {
  return (
    <List actions={<ChatMCPConnectionListToolbar />} sort={{ field: 'updatedAt', order: 'DESC' }}>
      <Datagrid rowClick="edit">
        <TextField source="name" />
        <TextField source="url" />
        <TextField source="transport" />
        <FunctionField
          label="Status"
          render={(record: Record<string, unknown>) => (
            <Chip
              label={record.status as string}
              color={statusColors[record.status as string] ?? 'default'}
              size="small"
            />
          )}
        />
        <FunctionField
          label="Tools"
          render={(record: Record<string, unknown>) => {
            const tools = record.discoveredTools as unknown[];
            return tools ? `${tools.length} tools` : '—';
          }}
        />
        <DateField source="lastConnectedAt" showTime emptyText="Never" />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
