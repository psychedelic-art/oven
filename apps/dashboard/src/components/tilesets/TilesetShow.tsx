'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  useRecordContext,
  useRefresh,
  ReferenceManyField,
  Datagrid,
} from 'react-admin';
import { Box, Button, Typography, Card, CardContent } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';

function SpritesheetPreview() {
  const record = useRecordContext();
  if (!record?.imagePath) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Spritesheet
        </Typography>
        <Box
          component="img"
          src={record.imagePath}
          alt="spritesheet"
          sx={{
            maxWidth: '100%',
            maxHeight: 300,
            imageRendering: 'pixelated',
            border: '1px solid #ccc',
            borderRadius: 1,
          }}
        />
        {record.columns && record.rows && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Grid: {record.columns} columns x {record.rows} rows = {record.columns * record.rows} tiles
            ({record.tileWidth}x{record.tileHeight}px each)
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function DetachButton() {
  const record = useRecordContext();
  const refresh = useRefresh();

  if (!record) return null;

  const handleDetach = async () => {
    if (!confirm(`Detach tile "${record.name}" from this tileset?`)) return;

    try {
      const res = await fetch(`/api/tiles/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tilesetId: null, spriteX: null, spriteY: null }),
      });
      if (res.ok) {
        refresh();
      } else {
        const err = await res.json();
        alert(`Detach failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Detach error: ${err}`);
    }
  };

  return (
    <Button
      size="small"
      color="warning"
      startIcon={<LinkOffIcon />}
      onClick={(e) => {
        e.stopPropagation();
        handleDetach();
      }}
      sx={{ textTransform: 'none' }}
    >
      Detach
    </Button>
  );
}

export default function TilesetShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="name" />
        <FunctionField
          label="Tile Size"
          render={(record: any) => `${record?.tileWidth}x${record?.tileHeight}px`}
        />
        <FunctionField
          label="Grid"
          render={(record: any) =>
            record?.columns && record?.rows
              ? `${record.columns}x${record.rows} (${record.columns * record.rows} tiles)`
              : 'Not sliced yet'
          }
        />
        <TextField source="description" />
        <DateField source="createdAt" label="Created" />
        <DateField source="updatedAt" label="Updated" />

        <SpritesheetPreview />

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
          Tiles in this Tileset
        </Typography>
        <ReferenceManyField reference="tiles" target="tilesetId" label={false}>
          <Datagrid bulkActionButtons={false} size="small" rowClick="edit">
            <NumberField source="tileId" label="ID" />
            <TextField source="name" />
            <TextField source="category" />
            <FunctionField
              label="Grid Pos"
              render={(r: any) =>
                r?.spriteX != null && r?.spriteY != null ? `(${r.spriteX}, ${r.spriteY})` : '\u2014'
              }
            />
            <FunctionField
              label="Preview"
              render={(r: any) =>
                r?.spritePath ? (
                  <img
                    src={r.spritePath}
                    alt={r.name}
                    style={{
                      width: 24,
                      height: 24,
                      imageRendering: 'pixelated',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      objectFit: 'contain',
                    }}
                  />
                ) : '\u2014'
              }
            />
            <DetachButton />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
}
