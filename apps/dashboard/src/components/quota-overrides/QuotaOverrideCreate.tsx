'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  TextInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function QuotaOverrideCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="subscriptionId" label="Subscription ID" isRequired fullWidth />
        <ReferenceInput source="serviceId" reference="services" label="Service">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <NumberInput source="quota" label="Override Quota Limit" isRequired fullWidth />
        <TextInput source="reason" label="Reason" multiline rows={2} fullWidth helperText="Why this override exists (e.g. VIP customer, trial extension)" />
      </SimpleForm>
    </Create>
  );
}
