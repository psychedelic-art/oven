'use client';

import { TextInput } from 'react-admin';

interface AdapterConfig {
  label: string;
  source: string;
  type?: string;
}

const adapterFieldsMap: Record<string, AdapterConfig[]> = {
  meta: [
    { label: 'Phone Number ID', source: 'config.phoneNumberId' },
    { label: 'Access Token', source: 'config.accessToken', type: 'password' },
    { label: 'App Secret', source: 'config.appSecret', type: 'password' },
    { label: 'Verify Token', source: 'config.verifyToken' },
  ],
  twilio: [
    { label: 'Account SID', source: 'config.accountSid' },
    { label: 'Auth Token', source: 'config.authToken', type: 'password' },
    { label: 'Phone Number', source: 'config.phoneNumber' },
  ],
  resend: [
    { label: 'API Key', source: 'config.apiKey', type: 'password' },
    { label: 'From Email', source: 'config.fromEmail' },
    { label: 'From Name', source: 'config.fromName' },
  ],
};

interface AdapterConfigFieldsProps {
  adapter: string;
}

export default function AdapterConfigFields({ adapter }: AdapterConfigFieldsProps) {
  const fields = adapterFieldsMap[adapter];
  if (!fields) return null;

  return (
    <>
      {fields.map((field) => (
        <TextInput
          key={field.source}
          source={field.source}
          label={field.label}
          type={field.type}
          fullWidth
        />
      ))}
    </>
  );
}
