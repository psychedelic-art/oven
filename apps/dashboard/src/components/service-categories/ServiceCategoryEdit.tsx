'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';

export default function ServiceCategoryEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Category Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <TextInput source="icon" label="Icon (MUI name)" fullWidth />
        <NumberInput source="order" label="Sort Order" />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
