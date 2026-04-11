import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
  required,
} from 'react-admin';

const eventChoices = [
  { id: 'pre-message', name: 'Pre-Message' },
  { id: 'post-message', name: 'Post-Message' },
  { id: 'pre-tool-use', name: 'Pre-Tool-Use' },
  { id: 'post-tool-use', name: 'Post-Tool-Use' },
  { id: 'on-error', name: 'On-Error' },
  { id: 'on-escalation', name: 'On-Escalation' },
  { id: 'session-start', name: 'Session-Start' },
  { id: 'session-end', name: 'Session-End' },
];

export function ChatHookCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <SelectInput source="event" choices={eventChoices} validate={required()} />
        <NumberInput source="priority" defaultValue={100} helperText="Lower number = higher priority" />
        <TextInput
          source="handler"
          fullWidth
          multiline
          rows={4}
          helperText='JSON: {"type": "event", "config": {"eventName": "...", "payload": {}}}'
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
        />
        <BooleanInput source="enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
