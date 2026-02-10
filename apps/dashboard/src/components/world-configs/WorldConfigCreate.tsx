'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';
import { Typography } from '@mui/material';

export default function WorldConfigCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="name" fullWidth isRequired />
        <BooleanInput source="isActive" label="Active" defaultValue={false} />
        <SelectInput
          source="mapMode"
          label="Map Mode"
          choices={[
            { id: 'discovery', name: 'Discovery' },
            { id: 'ai_generated', name: 'AI Generated' },
            { id: 'prebuilt', name: 'Prebuilt' },
          ]}
          defaultValue="discovery"
        />
        <NumberInput source="seed" label="Seed (optional)" />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Chunk System</Typography>
        <NumberInput source="chunkSize" label="Chunk Size" defaultValue={32} />
        <NumberInput source="loadRadius" label="Load Radius" defaultValue={2} />
        <NumberInput source="maxLoadsPerFrame" label="Max Loads/Frame" defaultValue={2} />
        <NumberInput source="tilemapPoolSize" label="Tilemap Pool Size" defaultValue={30} />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Terrain Generation</Typography>
        <NumberInput source="terrainNoiseScale" label="Terrain Noise Scale" defaultValue={0.05} step={0.01} />
        <NumberInput source="terrainNoiseOffset" label="Terrain Noise Offset" defaultValue={1000} />
        <NumberInput source="decorationNoiseScale" label="Decoration Noise Scale" defaultValue={0.15} step={0.01} />
        <NumberInput source="decorationNoiseThreshold" label="Decoration Threshold" defaultValue={0.78} step={0.01} />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Player</Typography>
        <NumberInput source="playerMoveSpeed" label="Move Speed" defaultValue={5.0} step={0.5} />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Camera</Typography>
        <NumberInput source="cameraOrthoSize" label="Ortho Size" defaultValue={8.0} step={0.5} />
        <NumberInput source="cameraSmoothSpeed" label="Smooth Speed" defaultValue={10.0} step={0.5} />
        <NumberInput source="directionBias" label="Direction Bias" defaultValue={-0.5} step={0.1} />
      </SimpleForm>
    </Create>
  );
}
