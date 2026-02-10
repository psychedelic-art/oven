'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
} from 'react-admin';
import { Typography } from '@mui/material';

export default function MapEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <SelectInput
          source="mode"
          choices={[
            { id: 'discovery', name: 'Discovery' },
            { id: 'ai_generated', name: 'AI Generated' },
            { id: 'prebuilt', name: 'Prebuilt' },
          ]}
        />
        <SelectInput
          source="status"
          choices={[
            { id: 'draft', name: 'Draft' },
            { id: 'generating', name: 'Generating' },
            { id: 'ready', name: 'Ready' },
            { id: 'archived', name: 'Archived' },
          ]}
        />
        <NumberInput source="worldConfigId" label="World Config ID" />
        <NumberInput source="seed" label="Seed" />
        <NumberInput source="totalChunks" label="Total Chunks" disabled />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Bounds</Typography>
        <NumberInput source="boundsMinX" label="Min X" />
        <NumberInput source="boundsMinY" label="Min Y" />
        <NumberInput source="boundsMaxX" label="Max X" />
        <NumberInput source="boundsMaxY" label="Max Y" />
      </SimpleForm>
    </Edit>
  );
}
