'use client';

import {
  List, Datagrid, TextField, BooleanField, DateField,
  TextInput, SelectInput, EditButton,
} from 'react-admin';
import { Chip } from '@mui/material';

const categoryColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'default'> = {
  llm: 'primary',
  tool: 'secondary',
  condition: 'warning',
  transform: 'default',
  'human-in-the-loop': 'error',
  memory: 'success',
};

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="category" source="category" label="Category" choices={[
    { id: 'llm', name: 'LLM' },
    { id: 'tool', name: 'Tool' },
    { id: 'condition', name: 'Condition' },
    { id: 'transform', name: 'Transform' },
    { id: 'human-in-the-loop', name: 'Human Review' },
    { id: 'memory', name: 'Memory' },
  ]} />,
];

export default function NodeList() {
  return (
    <List filters={filters}>
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
