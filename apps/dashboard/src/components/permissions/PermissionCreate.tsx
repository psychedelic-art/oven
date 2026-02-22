'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';

export default function PermissionCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="resource" fullWidth isRequired helperText="Resource name (e.g., players)" />
        <SelectInput
          source="action"
          isRequired
          choices={[
            { id: 'create', name: 'Create' },
            { id: 'read', name: 'Read' },
            { id: 'update', name: 'Update' },
            { id: 'delete', name: 'Delete' },
            { id: 'execute', name: 'Execute' },
            { id: 'manage', name: 'Manage (all)' },
          ]}
        />
        <TextInput source="description" fullWidth multiline rows={2} />
      </SimpleForm>
    </Create>
  );
}
