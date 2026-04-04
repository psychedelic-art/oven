'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip } from '@mui/material';

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'default'> = {
  openai: 'primary',
  anthropic: 'secondary',
  google: 'success',
  custom: 'default',
};

export default function ProviderShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="name" />
        <TextField source="slug" />
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip
              label={record?.type}
              size="small"
              color={typeColors[record?.type] ?? 'default'}
              variant="outlined"
            />
          )}
        />
        <TextField source="baseUrl" label="Base URL" />
        <FunctionField
          label="API Key"
          render={(record: any) => {
            const key = record?.apiKeyEncrypted;
            if (!key) return 'Not set';
            return `sk-...${String(key).slice(-4)}`;
          }}
        />
        <TextField source="defaultModel" label="Default Model" />
        <NumberField source="rateLimitRpm" label="Rate Limit (RPM)" />
        <NumberField source="rateLimitTpm" label="Rate Limit (TPM)" />
        <BooleanField source="enabled" />
        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
