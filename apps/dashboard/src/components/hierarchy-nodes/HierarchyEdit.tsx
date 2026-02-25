'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';

export default function HierarchyEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <SelectInput
          source="type"
          isRequired
          choices={[
            { id: 'company', name: 'Company' },
            { id: 'group', name: 'Group' },
            { id: 'team', name: 'Team' },
            { id: 'department', name: 'Department' },
          ]}
        />
        <ReferenceInput source="parentId" reference="hierarchy-nodes" label="Parent Node">
          <SelectInput optionText="name" emptyText="None (root)" />
        </ReferenceInput>
      </SimpleForm>
    </Edit>
  );
}
