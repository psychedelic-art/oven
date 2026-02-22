'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';

export default function PermissionEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="resource" fullWidth isRequired />
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
        <TextInput source="slug" fullWidth helperText="Auto-generated: resource.action" />
        <TextInput source="description" fullWidth multiline rows={2} />
      </SimpleForm>
    </Edit>
  );
}
