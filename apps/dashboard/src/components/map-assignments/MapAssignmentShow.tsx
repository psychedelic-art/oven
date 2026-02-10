'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip, Box, Typography } from '@mui/material';

export default function MapAssignmentShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="Assignment ID" />
        <NumberField source="playerId" label="Player ID" />
        <NumberField source="mapId" label="Map ID" />
        <FunctionField
          label="Status"
          render={(record: any) =>
            record?.isActive ? (
              <Chip label="Active" size="small" color="success" />
            ) : (
              <Chip label="Left" size="small" variant="outlined" />
            )
          }
        />
        <FunctionField
          label="Spawn Position"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace' }}>
              Tile ({record?.spawnTileX}, {record?.spawnTileY})
            </Box>
          )}
        />
        <FunctionField
          label="Current Position"
          render={(record: any) =>
            record?.currentTileX != null ? (
              <Box sx={{ fontFamily: 'monospace' }}>
                Tile ({record.currentTileX}, {record.currentTileY})
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Not tracked yet</Typography>
            )
          }
        />
        <DateField source="assignedAt" showTime label="Assigned At" />
        <DateField source="leftAt" showTime label="Left At" emptyText="Still assigned" />
      </SimpleShowLayout>
    </Show>
  );
}
