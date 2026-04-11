import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  DateField,
  EditButton,
  TextInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';

const sourceChoices = [
  { id: 'built-in', name: 'Built-in' },
  { id: 'custom', name: 'Custom' },
  { id: 'mcp', name: 'MCP' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="source" source="source" choices={sourceChoices} />,
  <BooleanInput key="enabled" source="enabled" label="Enabled only" />,
];

export function ChatSkillList() {
  return (
    <List filters={filters} sort={{ field: 'slug', order: 'ASC' }}>
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
