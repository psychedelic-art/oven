'use client';

import {
  Show,
  SimpleShowLayout,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Box, Typography } from '@mui/material';

export default function PositionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="Position ID" />
        <NumberField source="playerId" label="Player ID" />
        <NumberField source="sessionId" label="Session ID" />
        <NumberField source="mapId" label="Map ID" />
        <FunctionField
          label="Tile Position"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace' }}>
              ({record?.tileX}, {record?.tileY})
            </Box>
          )}
        />
        <FunctionField
          label="Chunk Position"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace' }}>
              ({record?.chunkX}, {record?.chunkY})
            </Box>
          )}
        />
        <FunctionField
          label="World Position"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace' }}>
              ({record?.worldX?.toFixed(2)}, {record?.worldY?.toFixed(2)})
            </Box>
          )}
        />
        <DateField source="recordedAt" showTime label="Recorded At" />
      </SimpleShowLayout>
    </Show>
  );
}
