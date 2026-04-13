'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  SelectInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

export default function TenantMemberCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
      <SimpleForm>
        <NumberInput source="userId" label="User ID" isRequired fullWidth />
        <SelectInput
          source="role"
          label="Role"
          choices={[
            { id: 'owner', name: 'Owner' },
            { id: 'admin', name: 'Admin' },
            { id: 'member', name: 'Member' },
          ]}
          defaultValue="member"
          isRequired
        />
      </SimpleForm>
    </Create>
  );
}
