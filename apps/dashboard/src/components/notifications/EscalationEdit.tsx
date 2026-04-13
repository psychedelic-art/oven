'use client';

import { Edit, SimpleForm, TextInput, SelectInput } from 'react-admin';

export default function EscalationEdit() {
  return (
    <Edit>
      <SimpleForm>
        <SelectInput
          source="status"
          label="Status"
          choices={[
            { id: 'pending', name: 'Pending' },
            { id: 'resolved', name: 'Resolved' },
          ]}
          fullWidth
        />
        <TextInput
          source="resolutionNotes"
          label="Resolution Notes"
          multiline
          fullWidth
        />
      </SimpleForm>
    </Edit>
  );
}
