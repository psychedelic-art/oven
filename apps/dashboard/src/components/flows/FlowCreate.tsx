'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { useTenantContext } from '@oven/dashboard-ui';

export default function FlowCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <TextInput source="name" label="Name" isRequired />
        <TextInput source="slug" label="Slug" isRequired />
        <TextInput source="description" label="Description" multiline rows={3} />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
