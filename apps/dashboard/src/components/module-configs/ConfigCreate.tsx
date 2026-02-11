'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
} from 'react-admin';

export default function ConfigCreate() {
  return (
    <Create>
      <SimpleForm>
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
          parse={(v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return v;
            }
          }}
          format={(v: unknown) =>
            typeof v === 'string' ? v : JSON.stringify(v)
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
