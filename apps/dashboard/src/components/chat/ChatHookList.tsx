import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  EditButton,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const eventChoices = [
  { id: 'pre-message', name: 'Pre-Message' },
  { id: 'post-message', name: 'Post-Message' },
  { id: 'pre-tool-use', name: 'Pre-Tool-Use' },
  { id: 'post-tool-use', name: 'Post-Tool-Use' },
  { id: 'on-error', name: 'On-Error' },
  { id: 'on-escalation', name: 'On-Escalation' },
  { id: 'session-start', name: 'Session-Start' },
  { id: 'session-end', name: 'Session-End' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'event', label: 'Event', kind: 'status', choices: eventChoices },
  { source: 'enabled', label: 'Enabled only', kind: 'boolean' },
];

function ChatHookListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatHookList() {
  return (
    <List actions={<ChatHookListToolbar />} sort={{ field: 'priority', order: 'ASC' }}>
      <Datagrid rowClick="edit">
        <TextField source="name" />
        <FunctionField
          label="Event"
          render={(record: Record<string, unknown>) => (
            <Chip label={record.event as string} size="small" sx={{ fontFamily: 'monospace' }} />
          )}
        />
        <FunctionField
          label="Handler"
          render={(record: Record<string, unknown>) => {
            const handler = record.handler as Record<string, unknown>;
            return <Chip label={handler?.type as string} size="small" variant="outlined" />;
          }}
        />
        <NumberField source="priority" />
        <BooleanField source="enabled" />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
