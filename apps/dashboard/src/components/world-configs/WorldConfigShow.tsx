'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip, Box, Typography, Divider } from '@mui/material';

export default function WorldConfigShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Status"
          render={(record: any) =>
            record?.isActive ? (
              <Chip label="Active" color="success" size="small" />
            ) : (
              <Chip label="Inactive" size="small" variant="outlined" />
            )
          }
        />
        <TextField source="mapMode" label="Map Mode" />
        <NumberField source="seed" label="Seed" emptyText="Random" />

        <FunctionField
          label="Chunk System"
          render={(record: any) => (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Size: ${record?.chunkSize}`} size="small" variant="outlined" />
              <Chip label={`Radius: ${record?.loadRadius}`} size="small" variant="outlined" />
              <Chip label={`Max/Frame: ${record?.maxLoadsPerFrame}`} size="small" variant="outlined" />
              <Chip label={`Pool: ${record?.tilemapPoolSize}`} size="small" variant="outlined" />
            </Box>
          )}
        />

        <FunctionField
          label="Terrain Generation"
          render={(record: any) => (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Noise: ${record?.terrainNoiseScale}`} size="small" color="success" variant="outlined" />
              <Chip label={`Offset: ${record?.terrainNoiseOffset}`} size="small" variant="outlined" />
              <Chip label={`Deco Scale: ${record?.decorationNoiseScale}`} size="small" color="info" variant="outlined" />
              <Chip label={`Deco Thresh: ${record?.decorationNoiseThreshold}`} size="small" variant="outlined" />
            </Box>
          )}
        />

        <FunctionField
          label="Biome Thresholds"
          render={(record: any) => {
            const t = record?.biomeThresholds;
            if (!t || typeof t !== 'object') return <Typography variant="body2" color="text.secondary">Default</Typography>;
            return (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(t).map(([k, v]) => (
                  <Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined"
                    sx={{ borderColor: k === 'water' ? '#2196f3' : k === 'grass' ? '#4caf50' : '#795548' }}
                  />
                ))}
              </Box>
            );
          }}
        />

        <NumberField source="playerMoveSpeed" label="Player Speed" />
        <NumberField source="cameraOrthoSize" label="Camera Ortho Size" />
        <NumberField source="cameraSmoothSpeed" label="Camera Smooth Speed" />
        <NumberField source="directionBias" label="Direction Bias" />
        <DateField source="createdAt" showTime label="Created" />
        <DateField source="updatedAt" showTime label="Updated" />
      </SimpleShowLayout>
    </Show>
  );
}
