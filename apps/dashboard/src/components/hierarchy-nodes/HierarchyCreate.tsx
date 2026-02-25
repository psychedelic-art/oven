'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';

export default function HierarchyCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired helperText="Node name (e.g., Acme Corp)" />
        <SelectInput
          source="type"
          isRequired
          choices={[
            { id: 'company', name: 'Company' },
            { id: 'group', name: 'Group' },
            { id: 'team', name: 'Team' },
            { id: 'department', name: 'Department' },
          ]}
          defaultValue="group"
        />
        <ReferenceInput source="parentId" reference="hierarchy-nodes" label="Parent Node">
          <SelectInput optionText="name" emptyText="None (root)" />
        </ReferenceInput>
      </SimpleForm>
    </Create>
  );
}
