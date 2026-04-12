'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
} from 'react-admin';

function validateJsonValue(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
    } catch (e) {
      return `Invalid JSON: ${(e as SyntaxError).message}`;
    }
  }
  return undefined;
}

export default function ConfigCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput
          source="tenantId"
          label="Tenant ID"
          helperText="Leave empty for platform-level config"
          fullWidth
        />
        <TextInput source="moduleName" label="Module Name" isRequired fullWidth />
        <SelectInput
          source="scope"
          label="Scope"
          choices={[
            { id: 'module', name: 'Module Default' },
            { id: 'instance', name: 'Instance Override' },
          ]}
          defaultValue="module"
          isRequired
        />
        <TextInput
          source="scopeId"
          label="Scope ID"
          helperText="Only for instance scope — e.g. the map ID or player ID"
          fullWidth
        />
        <TextInput source="key" label="Config Key" isRequired fullWidth />
        <TextInput
          source="value"
          label="Value (JSON)"
          helperText="Enter a JSON value: string, number, boolean, object, or array"
          isRequired
          fullWidth
          multiline
          minRows={2}
          sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
          validate={validateJsonValue}
          parse={(v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return v;
            }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v, null, 2)
          }
        />
        <TextInput
          source="description"
          label="Description"
          multiline
          rows={2}
          fullWidth
        />
      </SimpleForm>
    </Create>
  );
}
