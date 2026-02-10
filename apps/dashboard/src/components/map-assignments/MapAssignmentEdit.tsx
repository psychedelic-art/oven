'use client';

import {
  Edit,
  SimpleForm,
  NumberInput,
  BooleanInput,
} from 'react-admin';

export default function MapAssignmentEdit() {
  return (
    <Edit>
      <SimpleForm>
        <NumberInput source="playerId" label="Player ID" disabled />
        <NumberInput source="mapId" label="Map ID" disabled />
        <BooleanInput source="isActive" label="Active" />
        <NumberInput source="spawnTileX" label="Spawn Tile X" />
        <NumberInput source="spawnTileY" label="Spawn Tile Y" />
        <NumberInput source="currentTileX" label="Current Tile X" />
        <NumberInput source="currentTileY" label="Current Tile Y" />
      </SimpleForm>
    </Edit>
  );
}
