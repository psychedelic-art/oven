import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  NumberInput,
} from 'react-admin';

const statusChoices = [
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
  { id: 'closed', name: 'Closed' },
];

export function ChatSessionEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="title" fullWidth />
        <SelectInput source="status" choices={statusChoices} />
        <BooleanInput source="isPinned" label="Pinned" />
        <NumberInput source="agentId" label="Agent ID" />
        <TextInput source="channel" disabled />
        <TextInput source="sessionToken" disabled fullWidth helperText="Anonymous session token (read-only)" />
      </SimpleForm>
    </Edit>
  );
}
