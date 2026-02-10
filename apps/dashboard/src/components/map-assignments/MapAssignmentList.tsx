'use client';

import {
  List,
  Datagrid,
  NumberField,
  DateField,
  FunctionField,
  TextInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const filters = [
  <TextInput key="playerId" source="playerId" label="Player ID" alwaysOn />,
  <TextInput key="mapId" source="mapId" label="Map ID" />,
];

export default function MapAssignmentList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'DESC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <NumberField source="id" label="ID" />
        <NumberField source="playerId" label="Player" />
        <NumberField source="mapId" label="Map" />
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
          label="Spawn"
          render={(record: any) => (
            <Box sx={{ fontSize: 12, fontFamily: 'monospace' }}>
              ({record?.spawnTileX}, {record?.spawnTileY})
            </Box>
          )}
        />
        <FunctionField
          label="Current"
          render={(record: any) =>
            record?.currentTileX != null ? (
              <Box sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                ({record.currentTileX}, {record.currentTileY})
              </Box>
            ) : '-'
          }
        />
        <DateField source="assignedAt" label="Assigned" showTime />
        <DateField source="leftAt" label="Left At" showTime emptyText="-" />
      </Datagrid>
    </List>
  );
}
