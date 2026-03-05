'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  SelectInput,
} from 'react-admin';

export default function BillingPlanEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Plan Name" isRequired fullWidth />
        <TextInput source="slug" label="Slug" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={2} fullWidth />
        <NumberInput source="price" label="Price (cents)" fullWidth />
        <SelectInput
          source="currency"
          label="Currency"
          choices={[
            { id: 'COP', name: 'COP' },
            { id: 'USD', name: 'USD' },
          ]}
        />
        <SelectInput
          source="billingCycle"
          label="Billing Cycle"
          choices={[
            { id: 'monthly', name: 'Monthly' },
            { id: 'yearly', name: 'Yearly' },
          ]}
        />
        <TextInput
          source="features"
          label="Features (JSON)"
          fullWidth
          multiline
          rows={3}
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
        />
        <BooleanInput source="isPublic" label="Public" />
        <BooleanInput source="enabled" label="Enabled" />
        <NumberInput source="order" label="Display Order" />
      </SimpleForm>
    </Edit>
  );
}
