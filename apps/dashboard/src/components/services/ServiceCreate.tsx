'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function ServiceCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Service Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <ReferenceInput source="categoryId" reference="service-categories" label="Category">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <TextInput source="unit" label="Unit" isRequired fullWidth helperText="e.g. messages, tokens, gb, requests" />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
