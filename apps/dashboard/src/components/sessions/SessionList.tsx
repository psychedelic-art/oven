'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  useListContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import { FilterToolbar } from '@oven/dashboard-ui';
import type { FilterDefinition } from '@oven/dashboard-ui';

const filterDefinitions: FilterDefinition[] = [
  { source: 'player_id', label: 'Player ID', kind: 'quick-search', alwaysOn: true },
  { source: 'map_id', label: 'Map ID', kind: 'combo', choices: [] },
];

function SessionListToolbar() {
  const { filterValues, setFilters } = useListContext();
  return (
    <FilterToolbar
      filters={filterDefinitions}
      filterValues={filterValues}
      setFilters={(f) => setFilters(f, undefined, false)}
    />
  );
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Active';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SessionList() {
  return (
    <List actions={<SessionListToolbar />} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="playerId" label="Player" />
        <NumberField source="mapId" label="Map" />
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
          render={(record: any) => formatDuration(record?.startedAt, record?.endedAt)}
        />
        <FunctionField
          label="Start Pos"
          render={(record: any) =>
            record?.startTileX != null ? (
              <Box sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                ({record.startTileX}, {record.startTileY})
              </Box>
            ) : '-'
          }
        />
        <FunctionField
          label="End Pos"
          render={(record: any) =>
            record?.endTileX != null ? (
              <Box sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                ({record.endTileX}, {record.endTileY})
              </Box>
            ) : '-'
          }
        />
        <NumberField source="tilesTraveled" label="Tiles" />
        <NumberField source="chunksLoaded" label="Chunks" />
        <DateField source="startedAt" label="Started" showTime />
      </Datagrid>
    </List>
  );
}
