'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
  BooleanInput,
} from 'react-admin';

const typeChoices = [
  { id: 'text', name: 'Text' },
  { id: 'embedding', name: 'Embedding' },
  { id: 'image', name: 'Image' },
  { id: 'audio', name: 'Audio' },
  { id: 'video', name: 'Video' },
  { id: 'object', name: 'Object' },
];

export default function AliasEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput
          source="alias"
          label="Alias"
          isRequired
          fullWidth
          helperText="Friendly name used in API calls (e.g., 'fast', 'smart', 'cheap')"
        />
        <ReferenceInput source="providerId" reference="ai-providers" label="Provider">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <TextInput
          source="modelId"
          label="Model ID"
          isRequired
          fullWidth
          helperText="Provider-specific model identifier (e.g., 'gpt-4o-mini', 'claude-sonnet-4-20250514')"
        />
        <SelectInput
          source="type"
          label="Type"
          choices={typeChoices}
          isRequired
          fullWidth
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
