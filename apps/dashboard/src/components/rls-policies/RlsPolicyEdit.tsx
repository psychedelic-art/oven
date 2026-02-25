'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
  BooleanInput,
} from 'react-admin';
import { useDiscovery } from '@/hooks/useDiscovery';

export default function RlsPolicyEdit() {
  const { tables, loading } = useDiscovery();

  const tableChoices = tables.map((t) => ({ id: t, name: t }));

  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <TextInput source="slug" fullWidth isRequired />
        <TextInput source="description" fullWidth multiline rows={2} />
        <SelectInput
          source="targetTable"
          label="Target Table"
          choices={tableChoices}
          isRequired
          fullWidth
          isLoading={loading}
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
        />
        <ReferenceInput source="roleId" reference="roles" label="Role">
          <SelectInput optionText="name" emptyText="All roles" />
        </ReferenceInput>
        <ReferenceInput source="hierarchyNodeId" reference="hierarchy-nodes" label="Hierarchy Node">
          <SelectInput optionText="name" emptyText="None" />
        </ReferenceInput>
        <BooleanInput source="enabled" />
      </SimpleForm>
    </Edit>
  );
}
