'use client';

import {
  List,
  Datagrid,
  TextField,
  NumberField,
  FunctionField,
  TextInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
} from 'react-admin';
import { Box, Chip } from '@mui/material';

const FLAGS = [
  { bit: 1, label: 'Walk' },
  { bit: 2, label: 'Swim' },
  { bit: 4, label: 'Elevated' },
  { bit: 8, label: 'Transparent' },
  { bit: 16, label: 'Damage' },
  { bit: 32, label: 'Interact' },
];

const tileFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <SelectInput
    key="cat"
    source="category"
    choices={[
      { id: 'terrain', name: 'Terrain' },
      { id: 'decoration', name: 'Decoration' },
      { id: 'obstacle', name: 'Obstacle' },
    ]}
    alwaysOn
  />,
  <ReferenceInput key="tileset" source="tilesetId" reference="tilesets" alwaysOn>
    <AutocompleteInput optionText="name" label="Tileset" />
  </ReferenceInput>,
];

export default function TileList() {
  return (
    <List filters={tileFilters} sort={{ field: 'tileId', order: 'ASC' }}>
      <Datagrid rowClick="show">
        <NumberField source="tileId" label="ID" />
        <TextField source="name" />
        <FunctionField
          label="Color"
          render={(record: any) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: record?.colorHex?.substring(0, 7),
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <span style={{ fontSize: '0.8em', color: '#666' }}>
                {record?.colorHex}
              </span>
            </Box>
          )}
        />
        <FunctionField
          label="Sprite"
          render={(record: any) =>
            record?.spritePath ? (
              <img
                src={record.spritePath}
                alt={record.name}
                style={{
                  width: 32,
                  height: 32,
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                  border: '1px solid #eee',
                }}
              />
            ) : (
              <span style={{ color: '#999', fontSize: '0.8em' }}>—</span>
            )
          }
        />
        <TextField source="category" />
        <FunctionField
          label="Flags"
          render={(record: any) => {
            const active = FLAGS.filter((f) => (record?.flags & f.bit) !== 0);
            return (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {active.length > 0
                  ? active.map((f) => (
                      <Chip key={f.bit} label={f.label} size="small" variant="outlined" />
                    ))
                  : <Chip label="None" size="small" color="default" />}
              </Box>
            );
          }}
        />
      </Datagrid>
    </List>
  );
}
