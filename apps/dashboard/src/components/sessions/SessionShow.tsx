'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip, Box, Typography } from '@mui/material';

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Still active';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SessionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="Session ID" />
        <NumberField source="playerId" label="Player ID" />
        <NumberField source="mapId" label="Map ID" />
        <FunctionField
          label="Status"
          render={(record: any) =>
            record?.endedAt ? (
              <Chip label="Ended" size="small" variant="outlined" />
            ) : (
              <Chip label="Active" size="small" color="success" />
            )
          }
        />
        <FunctionField
          label="Duration"
          render={(record: any) => (
            <Typography variant="body2">
              {formatDuration(record?.startedAt, record?.endedAt)}
            </Typography>
          )}
        />
        <FunctionField
          label="Start Position"
          render={(record: any) =>
            record?.startTileX != null ? (
              <Box sx={{ fontFamily: 'monospace' }}>
                Tile ({record.startTileX}, {record.startTileY})
              </Box>
            ) : <Typography variant="body2" color="text.secondary">Not set</Typography>
          }
        />
        <FunctionField
          label="End Position"
          render={(record: any) =>
            record?.endTileX != null ? (
              <Box sx={{ fontFamily: 'monospace' }}>
                Tile ({record.endTileX}, {record.endTileY})
              </Box>
            ) : <Typography variant="body2" color="text.secondary">Not set</Typography>
          }
        />
        <NumberField source="tilesTraveled" label="Tiles Traveled" />
        <NumberField source="chunksLoaded" label="Chunks Loaded" />
        <DateField source="startedAt" showTime label="Started At" />
        <DateField source="endedAt" showTime label="Ended At" emptyText="Active" />
      </SimpleShowLayout>
    </Show>
  );
}
