'use client';

import {
  Create,
  SimpleForm,
  NumberInput,
} from 'react-admin';

export default function SessionCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="playerId" label="Player ID" isRequired />
        <NumberInput source="mapId" label="Map ID" isRequired />
        <NumberInput source="startTileX" label="Start Tile X" defaultValue={0} />
        <NumberInput source="startTileY" label="Start Tile Y" defaultValue={0} />
      </SimpleForm>
    </Create>
  );
}
