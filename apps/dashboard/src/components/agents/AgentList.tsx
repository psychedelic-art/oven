'use client';

import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  FunctionField, EditButton, useRecordContext, useListContext,
} from 'react-admin';
import { Chip, Button, Box } from '@mui/material';
import { FilterToolbar, useTenantContext } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
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

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'enabled', label: 'Enabled', kind: 'boolean' },
];

function AgentListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function AgentList() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);
  return (
    <List actions={<AgentListToolbar />} filter={activeTenantId ? { tenantId: activeTenantId } : undefined} sort={{ field: 'updatedAt', order: 'DESC' }}>
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
