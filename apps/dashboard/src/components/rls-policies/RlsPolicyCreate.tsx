'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';
import { useDiscovery } from '@/hooks/useDiscovery';

export default function RlsPolicyCreate() {
  const { tables, loading } = useDiscovery();

  const tableChoices = tables.map((t) => ({ id: t, name: t }));

  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired helperText="Policy display name" />
        <TextInput source="slug" fullWidth isRequired helperText="Unique identifier (used in PG policy name)" />
        <TextInput source="description" fullWidth multiline rows={2} />
        <SelectInput
          source="targetTable"
          label="Target Table"
          choices={tableChoices}
          isRequired
          fullWidth
          isLoading={loading}
          helperText="Table this policy applies to"
        />
        <SelectInput
          source="command"
          isRequired
          choices={[
            { id: 'ALL', name: 'ALL (all operations)' },
            { id: 'SELECT', name: 'SELECT' },
            { id: 'INSERT', name: 'INSERT' },
            { id: 'UPDATE', name: 'UPDATE' },
            { id: 'DELETE', name: 'DELETE' },
          ]}
          defaultValue="ALL"
        />
        <ReferenceInput source="roleId" reference="roles" label="Role">
          <SelectInput optionText="name" emptyText="All roles" />
        </ReferenceInput>
        <ReferenceInput source="hierarchyNodeId" reference="hierarchy-nodes" label="Hierarchy Node">
          <SelectInput optionText="name" emptyText="None" />
        </ReferenceInput>
      </SimpleForm>
    </Create>
  );
}
