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

const sourceChoices = [
  { id: 'built-in', name: 'Built-in' },
  { id: 'custom', name: 'Custom' },
  { id: 'mcp', name: 'MCP' },
];

const filterDefinitions: FilterDefinition[] = [
  { source: 'q', label: 'Search', kind: 'quick-search', alwaysOn: true },
  { source: 'source', label: 'Source', kind: 'status', choices: sourceChoices },
  { source: 'enabled', label: 'Enabled only', kind: 'boolean' },
];

function ChatSkillListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export function ChatSkillList() {
  return (
    <List actions={<ChatSkillListToolbar />} sort={{ field: 'slug', order: 'ASC' }}>
      <Datagrid rowClick="edit">
        <TextField source="slug" label="Skill" />
        <TextField source="name" />
        <TextField source="description" />
        <TextField source="source" />
        <BooleanField source="isBuiltIn" label="Built-in" />
        <BooleanField source="enabled" />
        <DateField source="updatedAt" showTime />
        <EditButton />
      </Datagrid>
    </List>
  );
}
