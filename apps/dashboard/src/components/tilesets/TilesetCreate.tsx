'use client';

import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
} from 'react-admin';

export default function TilesetCreate() {
  return (
    <Create>
      <SimpleForm>
        <TextInput
          source="name"
          fullWidth
          helperText="Unique name for this tileset (e.g. 'Overworld Terrain 16x16')"
        />
        <NumberInput
          source="tileWidth"
          label="Tile Width (px)"
          defaultValue={16}
          helperText="Width of each tile in the spritesheet in pixels"
        />
        <NumberInput
          source="tileHeight"
          label="Tile Height (px)"
          defaultValue={16}
          helperText="Height of each tile in the spritesheet in pixels"
        />
        <TextInput
          source="description"
          multiline
          rows={3}
          fullWidth
          helperText="Optional description of what this tileset contains"
        />
      </SimpleForm>
    </Create>
  );
}
