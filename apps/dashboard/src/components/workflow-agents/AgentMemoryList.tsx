'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
  DeleteButton,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search content" alwaysOn />,
  <TextInput key="key" source="key" label="Memory Key" />,
];

export function AgentMemoryList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }} emptyWhileLoading>
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
