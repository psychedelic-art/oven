'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';

export default function PlayerCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="username" fullWidth isRequired helperText="Unique username for login" />
        <TextInput source="displayName" label="Display Name" fullWidth isRequired helperText="Visible name in-game" />
        <SelectInput
          source="status"
          choices={[
            { id: 'active', name: 'Active' },
            { id: 'inactive', name: 'Inactive' },
          ]}
          defaultValue="active"
        />
      </SimpleForm>
    </Create>
  );
}
