'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
} from 'react-admin';

export default function BillingPlanCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Plan Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <NumberInput source="price" label="Price (cents)" fullWidth helperText="Monthly price in cents (e.g. 9900 = $99)" />
        <SelectInput
          source="currency"
          label="Currency"
          choices={[
            { id: 'COP', name: 'COP' },
            { id: 'USD', name: 'USD' },
          ]}
          defaultValue="COP"
        />
        <SelectInput
          source="billingCycle"
          label="Billing Cycle"
          choices={[
            { id: 'monthly', name: 'Monthly' },
            { id: 'yearly', name: 'Yearly' },
          ]}
          defaultValue="monthly"
        />
        <TextInput
          source="features"
          label="Features (JSON)"
          fullWidth
          multiline
          rows={3}
          helperText="Non-metered features: { maxMembers, customDomain, ... }"
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
        />
        <BooleanInput source="isPublic" label="Public (show on pricing page)" defaultValue={true} />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
        <NumberInput source="order" label="Display Order" defaultValue={0} />
      </SimpleForm>
    </Create>
  );
}
