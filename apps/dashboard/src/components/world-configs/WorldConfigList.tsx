'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  DateField,
  FunctionField,
  TextInput,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
];

export default function WorldConfigList() {
  return (
    <List filters={filters} sort={{ field: 'id', order: 'ASC' }}>
      <Datagrid rowClick="show" bulkActionButtons={false}>
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
        <TextField source="mapMode" label="Mode" />
        <NumberField source="chunkSize" label="Chunk" />
        <NumberField source="loadRadius" label="Radius" />
        <FunctionField
          label="Terrain"
          render={(record: any) => (
            <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
              noise: {record?.terrainNoiseScale} | deco: {record?.decorationNoiseScale}
            </Box>
          )}
        />
        <NumberField source="playerMoveSpeed" label="Speed" />
        <DateField source="createdAt" label="Created" />
      </Datagrid>
    </List>
  );
}
