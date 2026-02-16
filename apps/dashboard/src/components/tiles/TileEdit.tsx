'use client';

import { useState } from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ReferenceInput,
  AutocompleteInput,
  useRecordContext,
  useRefresh,
} from 'react-admin';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

const FLAGS = [
  { bit: 1, label: 'Walkable' },
  { bit: 2, label: 'Swimmable' },
  { bit: 4, label: 'Elevated' },
  { bit: 8, label: 'Transparent' },
  { bit: 16, label: 'Damaging' },
  { bit: 32, label: 'Interactable' },
];

function SpriteUploadField() {
  const record = useRecordContext();
  const refresh = useRefresh();
  const [uploading, setUploading] = useState(false);

  if (!record) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tileId', String(record.tileId));
      const res = await fetch('/api/tiles/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        refresh();
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (err) {
      alert(`Upload error: ${err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove sprite from this tile?')) return;
    try {
      const res = await fetch('/api/tiles/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tileId: record.tileId }),
      });
      if (res.ok) {
        refresh();
      }
    } catch (err) {
      alert(`Delete error: ${err}`);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2, mt: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Sprite
        </Typography>
        {record.spritePath ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <img
              src={record.spritePath}
              alt="sprite"
              style={{
                width: 64,
                height: 64,
                imageRendering: 'pixelated',
                border: '1px solid #ccc',
                borderRadius: 4,
              }}
            />
            <Box>
              <Typography
                variant="caption"
                display="block"
                sx={{ wordBreak: 'break-all', maxWidth: 300 }}
              >
                {record.spritePath}
              </Typography>
              <Button
                startIcon={<DeleteIcon />}
                color="error"
                size="small"
                onClick={handleDelete}
                sx={{ mt: 0.5 }}
              >
                Remove
              </Button>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No sprite uploaded — using solid color fallback
          </Typography>
        )}
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
          size="small"
        >
          {uploading ? 'Uploading...' : 'Upload Sprite'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={handleUpload}
          />
        </Button>
      </CardContent>
    </Card>
  );
}

function FlagsDisplay() {
  const record = useRecordContext();
  if (!record) return null;

  const active = FLAGS.filter((f) => (record.flags & f.bit) !== 0);
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Active flags:{' '}
        {active.length > 0
          ? active.map((f) => f.label).join(', ')
          : 'None'}
      </Typography>
    </Box>
  );
}

function ColorPreview() {
  const record = useRecordContext();
  if (!record?.colorHex) return null;

  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        backgroundColor: record.colorHex.substring(0, 7),
        border: '1px solid #ccc',
        borderRadius: '4px',
        mb: 1,
      }}
    />
  );
}

export default function TileEdit() {
  return (
    <Edit>
      <SimpleForm>
        <NumberInput source="tileId" label="Tile ID" disabled />
        <TextInput source="name" fullWidth />
        <ColorPreview />
        <TextInput source="colorHex" label="Color (Hex RGBA)" helperText="Format: #RRGGBBAA" />
        <SelectInput
          source="category"
          choices={[
            { id: 'terrain', name: 'Terrain' },
            { id: 'decoration', name: 'Decoration' },
            { id: 'obstacle', name: 'Obstacle' },
          ]}
        />
        <FlagsDisplay />
        <NumberInput
          source="flags"
          label="Flags (bitmask)"
          helperText="1=Walkable, 2=Swimmable, 4=Elevated, 8=Transparent, 16=Damaging, 32=Interactable"
        />
        <ReferenceInput source="tilesetId" reference="tilesets">
          <AutocompleteInput
            optionText="name"
            label="Tileset"
            helperText="Optional — assign this tile to a tileset for folder grouping"
          />
        </ReferenceInput>
        <TextInput source="description" multiline rows={3} fullWidth />
        <SpriteUploadField />
      </SimpleForm>
    </Edit>
  );
}
