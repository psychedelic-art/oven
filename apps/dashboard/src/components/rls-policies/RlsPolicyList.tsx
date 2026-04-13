'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  ReferenceField,
  useListContext,
} from 'react-admin';
import { Chip, Button, Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  applied: 'success',
  draft: 'warning',
  disabled: 'default',
};

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'applied', name: 'Applied' },
  { id: 'disabled', name: 'Disabled' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'status', label: 'Status', kind: 'status', choices: statusChoices },
  { source: 'targetTable', label: 'Target Table', kind: 'combo', choices: [] },
];

function RlsPolicyListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function RlsPolicyList() {
  const navigate = useNavigate();

  return (
    <List actions={<RlsPolicyListToolbar />} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <TextField source="slug" />
        <TextField source="targetTable" label="Table" />
        <TextField source="command" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <NumberField source="version" label="v" />
        <ReferenceField source="roleId" reference="roles" label="Role" emptyText="All">
          <TextField source="name" />
        </ReferenceField>
        <DateField source="appliedAt" label="Applied" emptyText="Never" />
        <FunctionField
          label="Actions"
          render={(record: any) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/rls-policies/${record.id}/editor`);
                }}
              >
                Builder
              </Button>
            </Box>
          )}
        />
      </Datagrid>
    </List>
  );
}
