'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function ServiceEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Service Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <ReferenceInput source="categoryId" reference="service-categories" label="Category">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <TextInput source="unit" label="Unit" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
