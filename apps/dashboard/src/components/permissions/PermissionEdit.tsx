'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';
import { useDiscovery } from '@/hooks/useDiscovery';

export default function PermissionEdit() {
  const { resources, loading } = useDiscovery();

  const resourceChoices = resources.map((r) => ({ id: r, name: r }));

  return (
    <Edit>
      <SimpleForm>
        <SelectInput
          source="resource"
          choices={resourceChoices}
          isRequired
          fullWidth
          isLoading={loading}
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
        <TextInput source="slug" fullWidth helperText="Auto-generated: resource.action" />
        <TextInput source="description" fullWidth multiline rows={2} />
      </SimpleForm>
    </Edit>
  );
}
