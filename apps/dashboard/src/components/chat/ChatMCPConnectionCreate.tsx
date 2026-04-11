import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  required,
} from 'react-admin';

const transportChoices = [
  { id: 'sse', name: 'SSE (Server-Sent Events)' },
  { id: 'http', name: 'HTTP (REST API)' },
];

export function ChatMCPConnectionCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth helperText="Display name for this connection" />
        <TextInput source="url" validate={required()} fullWidth helperText="MCP server URL (e.g., https://mcp.example.com)" />
        <SelectInput source="transport" choices={transportChoices} validate={required()} />
      </SimpleForm>
    </Create>
  );
}
