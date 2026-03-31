'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';

export default function ProviderCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Provider Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <TextInput source="website" label="Website URL" fullWidth />
        <TextInput source="logo" label="Logo URL" fullWidth />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
