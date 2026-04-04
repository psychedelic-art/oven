'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  BooleanInput,
  useRecordContext,
  Toolbar,
  SaveButton,
} from 'react-admin';
import { Box, Button, CircularProgress, Typography, Alert, Chip } from '@mui/material';
import { useState } from 'react';

const providerTypeChoices = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'google', name: 'Google' },
  { id: 'custom', name: 'Custom' },
];

function ConnectionStatus() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box component="span" sx={{ display: 'flex', mb: 2, alignItems: 'center', gap: 2 }}>
      <Chip
        label={record.hasApiKey ? 'API Key Configured' : 'No API Key'}
        color={record.hasApiKey ? 'success' : 'warning'}
        variant={record.hasApiKey ? 'filled' : 'outlined'}
      />
      {!record.hasApiKey && (
        <Typography variant="body2" component="span" color="text.secondary">
          Enter your API key below to connect this provider.
        </Typography>
      )}
    </Box>
  );
}

function TestConnectionButton() {
  const record = useRecordContext();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!record || !record.hasApiKey) return null;

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      // Test by making a lightweight generate call
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Say "ok" in one word.',
          model: record.slug,
          maxTokens: 5,
        }),
      });
      const data = await response.json();
      if (response.ok && data.text) {
        setResult({ ok: true, message: `Connected! (${data.latencyMs ?? '?'}ms, model: ${data.model})` });
      } else {
        setResult({ ok: false, message: data.error ?? 'Connection failed' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Button
        variant="outlined"
        onClick={handleTest}
        disabled={testing}
        size="small"
      >
        {testing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
        {testing ? 'Testing...' : 'Test Connection'}
      </Button>
      {result && (
        <Typography
          variant="body2"
          sx={{ color: result.ok ? 'success.main' : 'error.main' }}
        >
          {result.message}
        </Typography>
      )}
    </Box>
  );
}

function ApiKeyField() {
  const record = useRecordContext();
  const [showKeyInput, setShowKeyInput] = useState(false);

  if (!record) return null;

  if (record.hasApiKey && !showKeyInput) {
    return (
      <Box component="span" sx={{ display: 'block', mb: 2 }}>
        <Typography variant="body2" component="span" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          API Key
        </Typography>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Chip label={record.apiKeyEncrypted ?? '••••••••'} size="small" />
          <Button size="small" onClick={() => setShowKeyInput(true)}>
            Change Key
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <TextInput
        source="apiKeyEncrypted"
        label={record.hasApiKey ? 'New API Key' : 'API Key'}
        helperText={record.hasApiKey
          ? 'Enter a new key to replace the existing one.'
          : 'Paste your API key. It will be encrypted before storage.'}
        fullWidth
        type="password"
      />
      {record.hasApiKey && showKeyInput && (
        <Button size="small" onClick={() => setShowKeyInput(false)} sx={{ mt: -1 }}>
          Cancel
        </Button>
      )}
    </>
  );
}

const CustomToolbar = () => (
  <Toolbar>
    <SaveButton />
  </Toolbar>
);

export default function ProviderEdit() {
  return (
    <Edit>
      <ConnectionStatus />
      <TestConnectionButton />
      <SimpleForm toolbar={<CustomToolbar />}>
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
          label="Base URL (Optional)"
          helperText="Only for custom endpoints or proxies. Leave empty for standard provider URLs."
          fullWidth
        />
        <ApiKeyField />
        <TextInput source="defaultModel" label="Default Model" fullWidth />
        <NumberInput
          source="rateLimitRpm"
          label="Rate Limit (Requests/Min)"
          helperText="Maximum requests per minute."
        />
        <NumberInput
          source="rateLimitTpm"
          label="Rate Limit (Tokens/Min)"
          helperText="Maximum tokens per minute."
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
