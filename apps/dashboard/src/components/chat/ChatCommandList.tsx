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

const categoryChoices = [
  { id: 'general', name: 'General' },
  { id: 'agent', name: 'Agent' },
  { id: 'knowledge', name: 'Knowledge' },
  { id: 'skills', name: 'Skills' },
  { id: 'integrations', name: 'Integrations' },
];

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput key="category" source="category" choices={categoryChoices} />,
  <BooleanInput key="isBuiltIn" source="isBuiltIn" label="Built-in only" />,
];

export function ChatCommandList() {
  return (
    <List filters={filters} sort={{ field: 'slug', order: 'ASC' }}>
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
