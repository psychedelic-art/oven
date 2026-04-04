'use client';

import { Edit, SimpleForm, TextInput, NumberInput, BooleanInput } from 'react-admin';

export default function CategoryEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" fullWidth />
        <TextInput
          source="description"
          label="Description"
          multiline
          rows={3}
          fullWidth
        />
        <TextInput
          source="icon"
          label="Icon"
          fullWidth
          helperText="MUI icon name (e.g., EventNote, Schedule, Place)"
        />
        <NumberInput
          source="order"
          label="Display Order"
          helperText="Lower numbers appear first"
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
