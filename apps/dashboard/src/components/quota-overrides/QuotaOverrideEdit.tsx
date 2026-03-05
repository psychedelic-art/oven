'use client';

import {
  Edit,
  SimpleForm,
  NumberInput,
  TextInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function QuotaOverrideEdit() {
  return (
    <Edit>
      <SimpleForm>
        <ReferenceInput source="serviceId" reference="services" label="Service">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <NumberInput source="quota" label="Override Quota Limit" isRequired fullWidth />
        <TextInput source="reason" label="Reason" multiline rows={2} fullWidth />
      </SimpleForm>
    </Edit>
  );
}
