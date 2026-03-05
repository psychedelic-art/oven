'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

export default function FlowCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired />
        <TextInput source="slug" label="Slug" isRequired />
        <TextInput source="description" label="Description" multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
