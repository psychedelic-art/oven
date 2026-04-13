import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  DateField,
  EditButton,
  useListContext,
} from 'react-admin';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const categoryChoices = [
  { id: 'general', name: 'General' },
  { id: 'agent', name: 'Agent' },
  { id: 'knowledge', name: 'Knowledge' },
  { id: 'skills', name: 'Skills' },
  { id: 'integrations', name: 'Integrations' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'category', label: 'Category', kind: 'status', choices: categoryChoices },
  { source: 'isBuiltIn', label: 'Built-in only', kind: 'boolean' },
];

function ChatCommandListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatCommandList() {
  return (
    <List actions={<ChatCommandListToolbar />} sort={{ field: 'slug', order: 'ASC' }}>
      <Datagrid rowClick="edit">
        <TextField source="slug" label="Command" />
        <TextField source="name" />
        <TextField source="description" />
        <TextField source="category" />
        <TextField source="handler" />
        <BooleanField source="isBuiltIn" label="Built-in" />
        <BooleanField source="enabled" />
        <EditButton />
      </Datagrid>
    </List>
  );
}
