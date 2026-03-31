'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';

export default function ServiceCategoryCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Category Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <TextInput source="icon" label="Icon (MUI name)" fullWidth helperText="e.g. Chat, Psychology, CloudUpload" />
        <NumberInput source="order" label="Sort Order" defaultValue={0} />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
