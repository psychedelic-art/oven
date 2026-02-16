'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
} from 'react-admin';
import { Typography, Box } from '@mui/material';
import { useWatch } from 'react-hook-form';

function BoundsSection() {
  const mode = useWatch({ name: 'mode' });
  const isPrebuilt = mode === 'prebuilt';

  return (
    <Box sx={{ mt: 2, opacity: isPrebuilt ? 1 : 0.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Bounds (chunk coordinates)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {isPrebuilt
          ? 'Define the playable area for this prebuilt map. Each unit = 1 chunk (32x32 tiles by default).'
          : 'Bounds are optional for Discovery/AI maps. Switch to Prebuilt mode to define fixed playable area.'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <NumberInput
          source="boundsMinX"
          label="Min X (chunks)"
          helperText="Left edge of the playable area"
        />
        <NumberInput
          source="boundsMinY"
          label="Min Y (chunks)"
          helperText="Bottom edge of the playable area"
        />
        <NumberInput
          source="boundsMaxX"
          label="Max X (chunks)"
          helperText="Right edge of the playable area"
        />
        <NumberInput
          source="boundsMaxY"
          label="Max Y (chunks)"
          helperText="Top edge of the playable area"
        />
      </Box>
    </Box>
  );
}

export default function MapCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput
          source="name"
          fullWidth
          isRequired
          helperText="Unique display name shown in-game during map selection"
        />
        <SelectInput
          source="mode"
          choices={[
            { id: 'discovery', name: 'Discovery' },
            { id: 'ai_generated', name: 'AI Generated' },
            { id: 'prebuilt', name: 'Prebuilt' },
          ]}
          defaultValue="discovery"
          helperText="Discovery = infinite procedural terrain. Prebuilt = hand-painted with fixed bounds. AI Generated = server-side procedural."
        />
        <SelectInput
          source="status"
          choices={[
            { id: 'draft', name: 'Draft' },
            { id: 'ready', name: 'Ready' },
          ]}
          defaultValue="draft"
          helperText="Draft = work in progress. Ready = playable in-game."
        />
        <ReferenceInput source="worldConfigId" reference="world-configs">
          <AutocompleteInput
            optionText="name"
            label="World Config"
            helperText="Controls chunk size, terrain generation, camera, and player settings for this map"
          />
        </ReferenceInput>
        <NumberInput
          source="seed"
          label="Seed (optional)"
          helperText="Integer seed for reproducible terrain generation. Leave empty for random."
        />

        <BoundsSection />
      </SimpleForm>
    </Create>
  );
}
