'use client';
import { Create, SimpleForm, TextInput, NumberInput, SelectInput } from 'react-admin';

export default function UserCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="email" label="Email" isRequired fullWidth />
        <TextInput source="name" label="Name" isRequired fullWidth />
        <NumberInput source="defaultTenantId" label="Default Tenant ID" fullWidth />
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: 'active', name: 'Active' },
            { id: 'suspended', name: 'Suspended' },
            { id: 'pending', name: 'Pending' },
          ]}
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
}
