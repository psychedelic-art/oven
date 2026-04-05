import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  EditButton,
  TextInput,
  SelectInput,
  BooleanInput,
  FunctionField,
} from 'react-admin';
import { Chip } from '@mui/material';

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

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="event" source="event" choices={eventChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled only" />,
];

export function ChatHookList() {
  return (
    <List filters={filters} sort={{ field: 'priority', order: 'ASC' }}>
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
