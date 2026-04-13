'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

const ruleTypeChoices = [
  { id: 'keyword', name: 'Keyword' },
  { id: 'regex', name: 'Regex' },
  { id: 'classifier', name: 'Classifier' },
];

const scopeChoices = [
  { id: 'input', name: 'Input' },
  { id: 'output', name: 'Output' },
  { id: 'both', name: 'Both' },
];

const actionChoices = [
  { id: 'block', name: 'Block' },
  { id: 'warn', name: 'Warn' },
  { id: 'modify', name: 'Modify' },
];

export default function GuardrailCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <SelectInput
          source="ruleType"
          label="Rule Type"
          choices={ruleTypeChoices}
          isRequired
          fullWidth
        />
        <TextInput
          source="pattern"
          label="Pattern"
          multiline
          rows={3}
          fullWidth
          helperText="Keyword string or regex pattern to match against."
        />
        <SelectInput
          source="scope"
          label="Scope"
          choices={scopeChoices}
          isRequired
          fullWidth
        />
        <SelectInput
          source="action"
          label="Action"
          choices={actionChoices}
          isRequired
          fullWidth
        />
        <TextInput
          source="message"
          label="Message"
          multiline
          rows={2}
          fullWidth
          helperText="Message shown to the user when this guardrail is triggered."
        />
        <NumberInput
          source="priority"
          label="Priority"
          defaultValue={0}
          helperText="Lower numbers are evaluated first."
        />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
