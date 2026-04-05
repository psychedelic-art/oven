'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  required,
} from 'react-admin';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'active', name: 'Active' },
];

export function AgentWorkflowCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="slug" fullWidth helperText="Auto-generated from name if empty" />
        <TextInput source="description" fullWidth multiline />
        <NumberInput source="agentId" label="Agent ID" helperText="Link to an existing agent (optional)" />
        <SelectInput source="status" choices={statusChoices} defaultValue="draft" />
        <TextInput
          source="definition"
          fullWidth
          multiline
          rows={10}
          helperText="JSON workflow definition (states, edges, nodes)"
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          defaultValue={JSON.stringify({
            id: 'new-workflow',
            initial: 'start',
            states: {
              start: { invoke: { src: 'llm', input: { messages: [] }, onDone: 'done' } },
              done: { type: 'final' },
            },
          }, null, 2)}
        />
        <TextInput
          source="agentConfig"
          fullWidth
          multiline
          rows={4}
          helperText='JSON agent config: {"model": "fast", "temperature": 0.7, "maxSteps": 50}'
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
        />
      </SimpleForm>
    </Create>
  );
}
