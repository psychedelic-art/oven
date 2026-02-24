'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';
import { useDiscovery } from '@/hooks/useDiscovery';

export default function PermissionCreate() {
  const { resources, loading } = useDiscovery();

  const resourceChoices = resources.map((r) => ({ id: r, name: r }));

  return (
    <Create>
      <SimpleForm>
        <SelectInput
          source="resource"
          choices={resourceChoices}
          isRequired
          fullWidth
          isLoading={loading}
          helperText="Resource from registered modules"
        />
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
