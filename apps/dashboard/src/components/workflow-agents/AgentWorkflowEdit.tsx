'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  TabbedForm,
  FormTab,
  required,
} from 'react-admin';

const statusChoices = [
  { id: 'draft', name: 'Draft' },
  { id: 'active', name: 'Active' },
  { id: 'archived', name: 'Archived' },
];

export function AgentWorkflowEdit() {
  return (
    <Edit>
      <TabbedForm>
        <FormTab label="General">
          <TextInput source="name" validate={required()} fullWidth />
          <TextInput source="slug" disabled fullWidth />
          <TextInput source="description" fullWidth multiline />
          <NumberInput source="agentId" label="Agent ID" />
          <SelectInput source="status" choices={statusChoices} />
          <NumberInput source="version" disabled />
        </FormTab>

        <FormTab label="Definition">
          <TextInput
            source="definition"
            fullWidth
            multiline
            rows={20}
            helperText="JSON workflow definition — states, invoke, guards, transitions"
            format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
            parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          />
        </FormTab>

        <FormTab label="Agent Config">
          <TextInput
            source="agentConfig"
            fullWidth
            multiline
            rows={8}
            helperText='{"model": "fast", "temperature": 0.7, "maxSteps": 50, "systemPrompt": "...", "toolBindings": ["*"]}'
            format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
            parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          />
        </FormTab>

        <FormTab label="Memory Config">
          <TextInput
            source="memoryConfig"
            fullWidth
            multiline
            rows={4}
            helperText='{"enabled": true, "maxMemories": 100, "embeddingModel": "text-embedding-3-small"}'
            format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
            parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          />
        </FormTab>
      </TabbedForm>
    </Edit>
  );
}
