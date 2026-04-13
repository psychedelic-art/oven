import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  EditButton,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const statusChoices = [
  { id: 'active', name: 'Active', colour: 'success' as const },
  { id: 'archived', name: 'Archived', colour: 'default' as const },
  { id: 'closed', name: 'Closed', colour: 'error' as const },
];

const channelChoices = [
  { id: 'web', name: 'Web' },
  { id: 'portal', name: 'Portal' },
  { id: 'widget', name: 'Widget' },
  { id: 'api', name: 'API' },
];

const statusColors: Record<string, 'success' | 'default' | 'error'> = {
  active: 'success',
  archived: 'default',
  closed: 'error',
};

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'status', label: 'Status', kind: 'status', choices: statusChoices },
  { source: 'channel', label: 'Channel', kind: 'combo', choices: channelChoices },
  { source: 'isPinned', label: 'Pinned only', kind: 'boolean' },
];

function ChatSessionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatSessionList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <List
      actions={<ChatSessionListToolbar />}
      filter={activeTenantId ? { tenantId: activeTenantId } : undefined}
      sort={{ field: 'updatedAt', order: 'DESC' }}
    >
      <Datagrid rowClick="edit">
        <NumberField source="id" />
        <TextField source="title" emptyText="Untitled" />
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
        <TextField source="channel" />
        <FunctionField
          label="Pinned"
          render={(record: Record<string, unknown>) => record.isPinned ? 'Yes' : ''}
        />
        <DateField source="createdAt" showTime />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
