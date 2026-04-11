'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  PasswordInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';

const providerTypeChoices = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google' },
  { id: 'custom', name: 'Custom' },
];

export default function ProviderCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Provider Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <SelectInput
          source="type"
          label="Type"
          choices={providerTypeChoices}
          isRequired
          fullWidth
        />
        <TextInput
          source="baseUrl"
          label="Base URL"
          helperText="Custom endpoint for self-hosted models or proxies. Leave empty for default."
          fullWidth
        />
        <PasswordInput
          source="apiKeyEncrypted"
          label="API Key"
          helperText="Your provider's API key. Encrypted at rest."
          fullWidth
        />
        <TextInput source="defaultModel" label="Default Model" fullWidth />
        <NumberInput
          source="rateLimitRpm"
          label="Rate Limit (Requests/Min)"
          helperText="Maximum requests per minute. Leave empty for no limit."
        />
        <NumberInput
          source="rateLimitTpm"
          label="Rate Limit (Tokens/Min)"
          helperText="Maximum tokens per minute. Leave empty for no limit."
        />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
