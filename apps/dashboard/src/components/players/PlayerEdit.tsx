'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';

export default function PlayerEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="username" fullWidth isRequired />
        <TextInput source="displayName" label="Display Name" fullWidth isRequired />
        <SelectInput
          source="status"
          choices={[
            { id: 'active', name: 'Active' },
            { id: 'banned', name: 'Banned' },
            { id: 'inactive', name: 'Inactive' },
          ]}
        />
        <NumberInput source="totalPlayTimeSeconds" label="Total Play Time (seconds)" />
      </SimpleForm>
    </Edit>
  );
}
