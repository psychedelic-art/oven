'use client';

import {
  Create,
  SimpleForm,
  SelectInput,
  ReferenceInput,
  DateTimeInput,
} from 'react-admin';
import { useTenantContext } from '@oven/dashboard-ui';

export default function TenantSubscriptionCreate() {
  const activeTenantId = useTenantContext((s) => s.activeTenantId);

  return (
    <Create transform={(data: Record<string, unknown>) => ({ ...data, tenantId: data.tenantId ?? activeTenantId })}>
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
