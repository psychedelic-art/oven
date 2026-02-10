'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ReferenceInput,
} from 'react-admin';
import { Typography } from '@mui/material';

export default function MapCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <SelectInput
          source="mode"
          choices={[
            { id: 'discovery', name: 'Discovery' },
            { id: 'ai_generated', name: 'AI Generated' },
            { id: 'prebuilt', name: 'Prebuilt' },
          ]}
          defaultValue="discovery"
        />
        <SelectInput
          source="status"
          choices={[
            { id: 'draft', name: 'Draft' },
            { id: 'ready', name: 'Ready' },
          ]}
          defaultValue="draft"
        />
        <NumberInput source="worldConfigId" label="World Config ID" />
        <NumberInput source="seed" label="Seed (optional)" />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Bounds (optional)</Typography>
        <NumberInput source="boundsMinX" label="Min X" />
        <NumberInput source="boundsMinY" label="Min Y" />
        <NumberInput source="boundsMaxX" label="Max X" />
        <NumberInput source="boundsMaxY" label="Max Y" />
      </SimpleForm>
    </Create>
  );
}
