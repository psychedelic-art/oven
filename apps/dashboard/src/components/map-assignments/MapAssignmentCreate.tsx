'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
  BooleanInput,
} from 'react-admin';

export default function MapAssignmentCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="playerId" label="Player ID" isRequired />
        <NumberInput source="mapId" label="Map ID" isRequired />
        <BooleanInput source="isActive" label="Active" defaultValue={true} />
        <NumberInput source="spawnTileX" label="Spawn Tile X" defaultValue={0} />
        <NumberInput source="spawnTileY" label="Spawn Tile Y" defaultValue={0} />
      </SimpleForm>
    </Create>
  );
}
