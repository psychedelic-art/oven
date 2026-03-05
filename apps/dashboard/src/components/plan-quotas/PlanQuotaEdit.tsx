'use client';

import {
  Edit,
  SimpleForm,
  NumberInput,
  TextInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';

export default function PlanQuotaEdit() {
  return (
    <Edit>
      <SimpleForm>
        <ReferenceInput source="planId" reference="billing-plans" label="Billing Plan">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <ReferenceInput source="serviceId" reference="services" label="Service">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <NumberInput source="quota" label="Quota Limit" isRequired fullWidth />
        <SelectInput
          source="period"
          label="Period"
          choices={[
            { id: 'monthly', name: 'Monthly' },
            { id: 'daily', name: 'Daily' },
            { id: 'yearly', name: 'Yearly' },
          ]}
          isRequired
        />
        <NumberInput source="pricePerUnit" label="Overage Price Per Unit (cents)" fullWidth />
        <TextInput source="currency" label="Currency" fullWidth />
      </SimpleForm>
    </Edit>
  );
}
