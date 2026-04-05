import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  SelectInput,
  FunctionField,
} from 'react-admin';
import { Chip } from '@mui/material';

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

const filters = [
  <SelectInput key="transport" source="transport" choices={transportChoices} alwaysOn />,
];

export function ChatMCPConnectionList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }}>
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
