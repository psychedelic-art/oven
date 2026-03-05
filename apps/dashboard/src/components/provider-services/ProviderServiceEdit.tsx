'use client';

import {
  Edit,
  SimpleForm,
  NumberInput,
  TextInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
} from 'react-admin';

export default function ProviderServiceEdit() {
  return (
    <Edit>
      <SimpleForm>
        <ReferenceInput source="providerId" reference="providers" label="Provider">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <ReferenceInput source="serviceId" reference="services" label="Service">
          <SelectInput optionText="name" isRequired fullWidth />
        </ReferenceInput>
        <NumberInput source="costPerUnit" label="Cost Per Unit (cents)" fullWidth />
        <TextInput source="currency" label="Currency" fullWidth />
        <BooleanInput source="isDefault" label="Default Provider for this Service" />
        <BooleanInput source="enabled" label="Enabled" />
        <TextInput
          source="configSchema"
          label="Config Schema (JSON)"
          fullWidth
          multiline
          rows={4}
          helperText="Required credential fields: [{ key, label, type, required }]"
          parse={(v: string) => { try { return JSON.parse(v); } catch { return v; } }}
          format={(v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
        />
      </SimpleForm>
    </Edit>
  );
}
