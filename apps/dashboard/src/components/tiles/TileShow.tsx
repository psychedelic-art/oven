'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Box, Chip, Typography } from '@mui/material';

const FLAGS = [
  { bit: 1, label: 'Walkable' },
  { bit: 2, label: 'Swimmable' },
  { bit: 4, label: 'Elevated' },
  { bit: 8, label: 'Transparent' },
  { bit: 16, label: 'Damaging' },
  { bit: 32, label: 'Interactable' },
];

export default function TileShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="tileId" label="Tile ID" />
        <TextField source="name" />
        <FunctionField
          label="Color"
          render={(record: any) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: record?.colorHex?.substring(0, 7),
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Typography variant="body2">{record?.colorHex}</Typography>
            </Box>
          )}
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
                      <Chip key={f.bit} label={f.label} size="small" color="primary" variant="outlined" />
                    ))
                  : <Chip label="None" size="small" />}
              </Box>
            );
          }}
        />
        <FunctionField
          label="Sprite"
          render={(record: any) =>
            record?.spritePath ? (
              <Box>
                <img
                  src={record.spritePath}
                  alt={record.name}
                  style={{
                    width: 64,
                    height: 64,
                    imageRendering: 'pixelated',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                  }}
                />
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 0.5, wordBreak: 'break-all', maxWidth: 400 }}
                >
                  {record.spritePath}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No sprite — using solid color fallback
              </Typography>
            )
          }
        />
        <TextField source="description" />
        <DateField source="createdAt" showTime />
        <DateField source="updatedAt" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
