import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  required,
} from 'react-admin';

const categoryChoices = [
  { id: 'general', name: 'General' },
  { id: 'agent', name: 'Agent' },
  { id: 'knowledge', name: 'Knowledge' },
  { id: 'skills', name: 'Skills' },
  { id: 'integrations', name: 'Integrations' },
];

export function ChatCommandCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" validate={required()} fullWidth helperText="Lowercase, no spaces (e.g., my-command)" />
        <TextInput source="description" validate={required()} fullWidth multiline />
        <SelectInput source="category" choices={categoryChoices} defaultValue="general" />
        <TextInput source="handler" validate={required()} fullWidth helperText="Handler reference (e.g., custom:my-handler)" />
        <BooleanInput source="enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
