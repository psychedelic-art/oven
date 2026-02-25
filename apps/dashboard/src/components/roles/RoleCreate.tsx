'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  NumberInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function RoleCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired helperText="Role display name" />
        <TextInput source="slug" fullWidth isRequired helperText="Unique URL-safe identifier" />
        <TextInput source="description" fullWidth multiline rows={2} />
        <ReferenceInput source="hierarchyNodeId" reference="hierarchy-nodes" label="Hierarchy Node">
          <SelectInput optionText="name" emptyText="None (global)" />
        </ReferenceInput>
        <BooleanInput source="enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
