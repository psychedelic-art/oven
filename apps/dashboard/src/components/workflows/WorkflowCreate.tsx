'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
} from 'react-admin';

export default function WorkflowCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" label="Workflow Name" isRequired fullWidth />
        <TextInput source="description" label="Description" multiline rows={3} fullWidth />
        <TextInput
          source="triggerEvent"
          label="Trigger Event (optional)"
          helperText="Event that auto-starts this workflow. Leave empty for manual-only."
          fullWidth
        />
        <BooleanInput source="enabled" label="Enabled" defaultValue={true} />
      </SimpleForm>
    </Create>
  );
}
