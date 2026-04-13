'use client';

import { Edit, SimpleForm, TextInput, BooleanInput } from 'react-admin';
import AdapterConfigFields from './AdapterConfigFields';
import { useWatch } from 'react-hook-form';

function DynamicAdapterConfig() {
  const adapterName = useWatch({ name: 'adapterName' });
  if (!adapterName) return null;
  return <AdapterConfigFields adapter={adapterName} />;
}

export default function ChannelEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Channel Name" fullWidth />
        <TextInput source="channelType" label="Channel Type" disabled fullWidth />
        <TextInput source="adapterName" label="Adapter" disabled fullWidth />
        <DynamicAdapterConfig />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
