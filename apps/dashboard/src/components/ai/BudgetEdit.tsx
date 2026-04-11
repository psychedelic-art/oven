'use client';

import {
  Edit,
  SimpleForm,
  SelectInput,
  TextInput,
  NumberInput,
  BooleanInput,
} from 'react-admin';

const scopeChoices = [
  { id: 'global', name: 'Global' },
  { id: 'tenant', name: 'Tenant' },
  { id: 'agent', name: 'Agent' },
  { id: 'provider', name: 'Provider' },
];

const periodTypeChoices = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
];

export default function BudgetEdit() {
  return (
    <Edit>
      <SimpleForm>
        <SelectInput
          source="scope"
          label="Scope"
          choices={scopeChoices}
          isRequired
          fullWidth
        />
        <TextInput
          source="scopeId"
          label="Scope ID"
          fullWidth
          helperText="The entity ID for the selected scope."
        />
        <SelectInput
          source="periodType"
          label="Period Type"
          choices={periodTypeChoices}
          isRequired
          fullWidth
        />
        <NumberInput
          source="tokenLimit"
          label="Token Limit"
          helperText="Maximum tokens allowed per period. Leave empty for cost-only limits."
        />
        <NumberInput
          source="costLimitCents"
          label="Cost Limit (cents)"
          helperText="Maximum spending per period in cents (e.g., 10000 = $100.00)."
        />
        <NumberInput
          source="alertThresholdPct"
          label="Alert Threshold %"
          helperText="Percentage at which a warning alert is generated."
        />
        <BooleanInput source="enabled" label="Enabled" />
      </SimpleForm>
    </Edit>
  );
}
