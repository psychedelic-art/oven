'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';

export default function TenantMemberCreate() {
  return (
    <Create>
      <SimpleForm>
        <ReferenceInput source="tenantId" reference="tenants" label="Tenant">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
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
