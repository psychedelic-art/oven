'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
} from 'react-admin';
import { Box } from '@mui/material';

const filters = [
  <TextInput key="playerId" source="playerId" label="Player ID" alwaysOn />,
  <TextInput key="sessionId" source="sessionId" label="Session ID" />,
  <TextInput key="mapId" source="mapId" label="Map ID" />,
];

export default function PositionList() {
  return (
    <List
      filters={filters}
      sort={{ field: 'id', order: 'DESC' }}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="playerId" label="Player" />
        <NumberField source="sessionId" label="Session" />
        <NumberField source="mapId" label="Map" />
        <FunctionField
          label="Tile"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
              ({record?.tileX}, {record?.tileY})
            </Box>
          )}
        />
        <FunctionField
          label="Chunk"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
              ({record?.chunkX}, {record?.chunkY})
            </Box>
          )}
        />
        <FunctionField
          label="World"
          render={(record: any) => (
            <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
              ({record?.worldX?.toFixed(1)}, {record?.worldY?.toFixed(1)})
            </Box>
          )}
        />
        <DateField source="recordedAt" label="Recorded" showTime />
      </Datagrid>
    </List>
  );
}
