'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  SelectInput,
  ReferenceInput,
  DateTimeInput,
} from 'react-admin';

export default function TenantSubscriptionCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="tenantId" label="Tenant ID" isRequired fullWidth />
        <ReferenceInput source="planId" reference="billing-plans" label="Billing Plan">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: 'active', name: 'Active' },
            { id: 'trial', name: 'Trial' },
            { id: 'past_due', name: 'Past Due' },
            { id: 'cancelled', name: 'Cancelled' },
            { id: 'expired', name: 'Expired' },
          ]}
          defaultValue="active"
          isRequired
        />
        <DateTimeInput source="startsAt" label="Start Date" fullWidth />
        <DateTimeInput source="expiresAt" label="Expires At" fullWidth />
        <DateTimeInput source="trialEndsAt" label="Trial Ends At" fullWidth />
      </SimpleForm>
    </Create>
  );
}
