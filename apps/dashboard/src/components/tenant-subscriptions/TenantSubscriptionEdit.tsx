'use client';

import {
  Edit,
  SimpleForm,
  SelectInput,
  ReferenceInput,
  DateTimeInput,
} from 'react-admin';

export default function TenantSubscriptionEdit() {
  return (
    <Edit>
      <SimpleForm>
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
          isRequired
        />
        <DateTimeInput source="startsAt" label="Start Date" fullWidth />
        <DateTimeInput source="expiresAt" label="Expires At" fullWidth />
        <DateTimeInput source="trialEndsAt" label="Trial Ends At" fullWidth />
      </SimpleForm>
    </Edit>
  );
}
