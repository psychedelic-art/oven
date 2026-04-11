import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  EditButton,
  FilterButton,
  SelectInput,
  TextInput,
  BooleanInput,
} from 'react-admin';
import { Chip } from '@mui/material';

const statusChoices = [
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
  { id: 'closed', name: 'Closed' },
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

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="status" source="status" choices={statusChoices} />,
  <SelectInput key="channel" source="channel" choices={channelChoices} />,
  <BooleanInput key="isPinned" source="isPinned" label="Pinned only" />,
];

export function ChatSessionList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }}>
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
          render={(record: Record<string, unknown>) => record.isPinned ? '📌' : ''}
        />
        <DateField source="createdAt" showTime />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
