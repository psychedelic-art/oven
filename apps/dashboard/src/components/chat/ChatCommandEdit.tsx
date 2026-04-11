import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  BooleanField,
  required,
} from 'react-admin';

const categoryChoices = [
  { id: 'general', name: 'General' },
  { id: 'agent', name: 'Agent' },
  { id: 'knowledge', name: 'Knowledge' },
  { id: 'skills', name: 'Skills' },
  { id: 'integrations', name: 'Integrations' },
];

export function ChatCommandEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" disabled fullWidth />
        <TextInput source="description" validate={required()} fullWidth multiline />
        <SelectInput source="category" choices={categoryChoices} />
        <TextInput source="handler" validate={required()} fullWidth />
        <BooleanInput source="enabled" />
        <BooleanField source="isBuiltIn" label="Built-in (read-only)" />
      </SimpleForm>
    </Edit>
  );
}
