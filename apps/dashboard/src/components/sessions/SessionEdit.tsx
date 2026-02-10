'use client';

import {
  Edit,
  SimpleForm,
  NumberInput,
  DateTimeInput,
} from 'react-admin';

export default function SessionEdit() {
  return (
    <Edit>
      <SimpleForm>
        <NumberInput source="playerId" label="Player ID" disabled />
        <NumberInput source="mapId" label="Map ID" disabled />
        <NumberInput source="startTileX" label="Start Tile X" />
        <NumberInput source="startTileY" label="Start Tile Y" />
        <NumberInput source="endTileX" label="End Tile X" />
        <NumberInput source="endTileY" label="End Tile Y" />
        <NumberInput source="tilesTraveled" label="Tiles Traveled" />
        <NumberInput source="chunksLoaded" label="Chunks Loaded" />
      </SimpleForm>
    </Edit>
  );
}
