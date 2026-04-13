'use client';

import { Create, SimpleForm, TextInput, SelectInput, BooleanInput } from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';
import AdapterConfigFields from './AdapterConfigFields';
import { useWatch } from 'react-hook-form';

const channelTypeChoices = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'sms', name: 'SMS' },
  { id: 'email', name: 'Email' },
];

const adapterChoicesMap: Record<string, { id: string; name: string }[]> = {
  whatsapp: [{ id: 'meta', name: 'Meta WhatsApp Business' }],
  sms: [{ id: 'twilio', name: 'Twilio' }],
  email: [{ id: 'resend', name: 'Resend' }],
};

function AdapterSelector() {
  const channelType = useWatch({ name: 'channelType' });
  const choices = channelType ? adapterChoicesMap[channelType] ?? [] : [];

  if (!channelType) return null;

  return (
    <SelectInput
      source="adapterName"
      label="Adapter"
      choices={choices}
      fullWidth
      isRequired
    />
  );
}

function DynamicAdapterConfig() {
  const adapterName = useWatch({ name: 'adapterName' });
  if (!adapterName) return null;
  return <AdapterConfigFields adapter={adapterName} />;
}

export default function ChannelCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Channel Name" isRequired fullWidth />
        <SelectInput
          source="channelType"
          label="Channel Type"
          choices={channelTypeChoices}
          isRequired
          fullWidth
        />
        <AdapterSelector />
        <DynamicAdapterConfig />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
