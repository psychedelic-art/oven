'use client';

import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';
import { Typography } from '@mui/material';

export default function WorldConfigEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <BooleanInput source="isActive" label="Active" />
        <SelectInput
          source="mapMode"
          label="Map Mode"
          choices={[
            { id: 'discovery', name: 'Discovery' },
            { id: 'ai_generated', name: 'AI Generated' },
            { id: 'prebuilt', name: 'Prebuilt' },
          ]}
        />
        <NumberInput source="seed" label="Seed (optional)" />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Chunk System</Typography>
        <NumberInput source="chunkSize" label="Chunk Size" />
        <NumberInput source="loadRadius" label="Load Radius" />
        <NumberInput source="maxLoadsPerFrame" label="Max Loads/Frame" />
        <NumberInput source="tilemapPoolSize" label="Tilemap Pool Size" />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Terrain Generation</Typography>
        <NumberInput source="terrainNoiseScale" label="Terrain Noise Scale" step={0.01} />
        <NumberInput source="terrainNoiseOffset" label="Terrain Noise Offset" />
        <NumberInput source="decorationNoiseScale" label="Decoration Noise Scale" step={0.01} />
        <NumberInput source="decorationNoiseThreshold" label="Decoration Threshold" step={0.01} />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Player</Typography>
        <NumberInput source="playerMoveSpeed" label="Move Speed" step={0.5} />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Camera</Typography>
        <NumberInput source="cameraOrthoSize" label="Ortho Size" step={0.5} />
        <NumberInput source="cameraSmoothSpeed" label="Smooth Speed" step={0.5} />
        <NumberInput source="directionBias" label="Direction Bias" step={0.1} />
      </SimpleForm>
    </Edit>
  );
}
