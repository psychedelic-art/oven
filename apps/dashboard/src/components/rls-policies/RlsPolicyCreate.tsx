'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';

export default function RlsPolicyCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired helperText="Policy display name" />
        <TextInput source="slug" fullWidth isRequired helperText="Unique identifier (used in PG policy name)" />
        <TextInput source="description" fullWidth multiline rows={2} />
        <TextInput source="targetTable" label="Target Table" fullWidth isRequired helperText="Table this policy applies to (e.g., players)" />
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
