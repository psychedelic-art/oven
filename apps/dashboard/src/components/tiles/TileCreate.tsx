'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
} from 'react-admin';

export default function TileCreate() {
  return (
    <Create>
      <SimpleForm>
        <NumberInput source="tileId" label="Tile ID" helperText="Unique numeric ID (1-65535)" />
        <TextInput source="name" fullWidth />
        <TextInput
          source="colorHex"
          label="Color (Hex RGBA)"
          defaultValue="#FFFFFFFF"
          helperText="Format: #RRGGBBAA — used as fallback when no sprite"
        />
        <SelectInput
          source="category"
          choices={[
            { id: 'terrain', name: 'Terrain' },
            { id: 'decoration', name: 'Decoration' },
            { id: 'obstacle', name: 'Obstacle' },
          ]}
          defaultValue="terrain"
        />
        <NumberInput
          source="flags"
          label="Flags (bitmask)"
          defaultValue={1}
          helperText="1=Walkable, 2=Swimmable, 4=Elevated, 8=Transparent, 16=Damaging, 32=Interactable"
        />
        <TextInput source="description" multiline rows={3} fullWidth />
      </SimpleForm>
    </Create>
  );
}
