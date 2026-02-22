'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
  BooleanInput,
} from 'react-admin';

export default function RlsPolicyEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <TextInput source="slug" fullWidth isRequired />
        <TextInput source="description" fullWidth multiline rows={2} />
        <TextInput source="targetTable" label="Target Table" fullWidth isRequired />
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
