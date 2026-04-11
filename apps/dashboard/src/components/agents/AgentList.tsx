'use client';

import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  FunctionField, TextInput, BooleanInput, EditButton, useRecordContext,
} from 'react-admin';
import { Chip, Button, Box } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate } from 'react-router-dom';

function TestButton() {
  const record = useRecordContext();
  const navigate = useNavigate();
  if (!record) return null;
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<SmartToyIcon sx={{ fontSize: 16 }} />}
      sx={{ textTransform: 'none' }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/agents/${record.id}`);
      }}
    >
      Test
    </Button>
  );
}

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <BooleanInput key="enabled" source="enabled" label="Enabled" />,
];

export default function AgentList() {
  return (
    <List filters={filters} sort={{ field: 'updatedAt', order: 'DESC' }}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <FunctionField
          label="Model"
          render={(record: Record<string, unknown>) => {
            const cfg = record?.llmConfig as Record<string, unknown> | null;
            return <Chip label={cfg?.model as string ?? 'fast'} size="small" variant="outlined" />;
          }}
        />
        <FunctionField
          label="Tools"
          render={(record: Record<string, unknown>) => {
            const bindings = (record?.toolBindings as string[]) ?? [];
            const label = bindings.includes('*') ? 'All' : `${bindings.length}`;
            return <Chip label={label} size="small" variant="outlined" />;
          }}
        />
        <BooleanField source="enabled" label="Active" />
        <NumberField source="version" label="v" />
        <DateField source="updatedAt" label="Updated" showTime />
        <TestButton />
        <EditButton />
      </Datagrid>
    </List>
  );
}
