'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'playerId', label: 'Player ID', kind: 'quick-search', alwaysOn: true },
  { source: 'sessionId', label: 'Session ID', kind: 'combo', choices: [] },
  { source: 'mapId', label: 'Map ID', kind: 'combo', choices: [] },
];

function PositionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

export default function PositionList() {
  return (
    <List
      actions={<PositionListToolbar />}
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
