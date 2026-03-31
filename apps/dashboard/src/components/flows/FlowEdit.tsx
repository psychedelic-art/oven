'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

export default function FlowEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired />
        <TextInput source="slug" label="Slug" isRequired />
        <TextInput source="description" label="Description" multiline rows={3} />
        <NumberInput source="tenantId" label="Tenant ID" isRequired />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
