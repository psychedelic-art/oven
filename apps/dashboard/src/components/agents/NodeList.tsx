'use client';

import {
  List, Datagrid, TextField, BooleanField, DateField,
  EditButton, useListContext,
} from 'react-admin';
import { Chip } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const categoryColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default'> = {
  llm: 'primary',
  tool: 'secondary',
  condition: 'warning',
  transform: 'default',
  'human-in-the-loop': 'error',
  memory: 'success',
};

const categoryChoices = [
  { id: 'llm', name: 'LLM' },
  { id: 'tool', name: 'Tool' },
  { id: 'condition', name: 'Condition' },
  { id: 'transform', name: 'Transform' },
  { id: 'human-in-the-loop', name: 'Human Review' },
  { id: 'memory', name: 'Memory' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'category', label: 'Category', kind: 'status', choices: categoryChoices },
];

function NodeListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function NodeList() {
  return (
    <List actions={<NodeListToolbar />}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="name" label="Name" />
        <TextField source="slug" label="Slug" />
        <TextField source="category" label="Category" />
        <TextField source="description" label="Description" />
        <BooleanField source="isSystem" label="System" />
        <EditButton />
      </Datagrid>
    </List>
  );
}
