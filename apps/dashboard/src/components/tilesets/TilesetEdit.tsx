'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  useRecordContext,
  useRefresh,
  useRedirect,
  ReferenceManyField,
  Datagrid,
  TextField,
  NumberField,
  FunctionField,
} from 'react-admin';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeleteIcon from '@mui/icons-material/Delete';
import GridOnIcon from '@mui/icons-material/GridOn';

/* ─── Spritesheet upload ─────────────────────────────────────────── */

function SpritesheetUploadField() {
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
      const res = await fetch(`/api/tilesets/${record.id}/upload`, {
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

  return (
    <Card variant="outlined" sx={{ mb: 2, mt: 1 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Spritesheet Image
        </Typography>
        {record.imagePath ? (
          <Box sx={{ mb: 1 }}>
            <Box
              component="img"
              src={record.imagePath}
              alt="spritesheet"
              sx={{
                maxWidth: 400,
                maxHeight: 200,
                imageRendering: 'pixelated',
                border: '1px solid #ccc',
                borderRadius: 1,
                display: 'block',
                mb: 1,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {record.imagePath}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No spritesheet uploaded yet. Upload an image to enable slicing.
          </Typography>
        )}
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
          size="small"
        >
          {uploading ? 'Uploading...' : record.imagePath ? 'Replace Image' : 'Upload Spritesheet'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleUpload}
          />
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── Slice preview canvas ───────────────────────────────────────── */

function SlicePreviewCanvas({
  imageSrc,
  columns,
  rows,
  tileW,
  tileH,
}: {
  imageSrc: string;
  columns: number;
  rows: number;
  tileW: number;
  tileH: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;

    const maxDisplayW = 600;
    const scale = Math.min(maxDisplayW / img.naturalWidth, 1);
    const displayW = Math.floor(img.naturalWidth * scale);
    const displayH = Math.floor(img.naturalHeight * scale);

    canvas.width = displayW;
    canvas.height = displayH;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, displayW, displayH);

    // Draw the spritesheet
    ctx.drawImage(img, 0, 0, displayW, displayH);

    // Draw grid overlay
    if (columns > 0 && rows > 0 && tileW > 0 && tileH > 0) {
      ctx.strokeStyle = 'rgba(255, 0, 100, 0.7)';
      ctx.lineWidth = 1;

      // Vertical lines
      for (let col = 0; col <= columns; col++) {
        const x = Math.round(col * tileW * scale) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayH);
        ctx.stroke();
      }

      // Horizontal lines
      for (let row = 0; row <= rows; row++) {
        const y = Math.round(row * tileH * scale) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(displayW, y);
        ctx.stroke();
      }

      // Draw tile indices (only if tiles are big enough to fit text)
      const cellDisplayW = tileW * scale;
      const cellDisplayH = tileH * scale;
      if (cellDisplayW > 20 && cellDisplayH > 16) {
        ctx.font = `${Math.min(10, Math.floor(cellDisplayW / 3))}px monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const cx = (col + 0.5) * tileW * scale;
            const cy = (row + 0.5) * tileH * scale;
            // Draw shadow for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(`${col},${row}`, cx + 1, cy + 1);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(`${col},${row}`, cx, cy);
          }
        }
      }
    }
  }, [columns, rows, tileW, tileH]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        border: '1px solid #555',
        borderRadius: 4,
        maxWidth: '100%',
      }}
    />
  );
}

/* ─── Slice section ──────────────────────────────────────────────── */

function SliceSection() {
  const record = useRecordContext();
  const refresh = useRefresh();
  const [slicing, setSlicing] = useState(false);
  const [sliceResult, setSliceResult] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(0);
  const [rows, setRows] = useState<number>(0);
  const [startTileId, setStartTileId] = useState<number>(100);
  const [categoryPrefix, setCategoryPrefix] = useState('terrain');

  // Image natural dimensions
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);

  // Load image dimensions when imagePath changes
  useEffect(() => {
    if (!record?.imagePath) {
      setImageDims(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setImageDims(null);
    img.src = record.imagePath;
  }, [record?.imagePath]);

  // Pre-fill columns/rows from tileset record (if already set)
  useEffect(() => {
    if (record?.columns && record.columns > 0) setColumns(record.columns);
    if (record?.rows && record.rows > 0) setRows(record.rows);
  }, [record?.columns, record?.rows]);

  // Auto-compute startTileId from max existing tileId
  useEffect(() => {
    fetch('/api/tiles?sort=["tileId","DESC"]&range=[0,0]')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0 && data[0].tileId) {
          setStartTileId(data[0].tileId + 1);
        }
      })
      .catch(() => {
        // Keep default
      });
  }, []);

  if (!record?.imagePath) return null;

  // Compute tile dimensions from image size and grid
  const computedTileW = imageDims && columns > 0
    ? Math.floor(imageDims.w / columns)
    : 0;
  const computedTileH = imageDims && rows > 0
    ? Math.floor(imageDims.h / rows)
    : 0;

  const handleSlice = async () => {
    if (!columns || !rows || !startTileId) {
      alert('Please set columns, rows, and start tile ID');
      return;
    }
    setSlicing(true);
    setSliceResult(null);
    try {
      const res = await fetch(`/api/tilesets/${record.id}/slice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTileId,
          columns,
          rows,
          categoryPrefix,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSliceResult(`Created ${data.tilesCreated} tiles (each ${computedTileW}x${computedTileH}px)`);
        refresh();
      } else {
        setSliceResult(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSliceResult(`Error: ${err}`);
    } finally {
      setSlicing(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GridOnIcon fontSize="small" />
          Slice Spritesheet into Tiles
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the number of columns and rows to define the grid. Tile dimensions are auto-calculated
          from the spritesheet image size.
        </Typography>

        {/* Grid controls */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="caption" display="block">Columns</Typography>
            <input
              type="number"
              min={1}
              value={columns}
              onChange={(e) => setColumns(parseInt(e.target.value) || 0)}
              style={{ width: 80, padding: '6px 8px' }}
            />
          </Box>
          <Box>
            <Typography variant="caption" display="block">Rows</Typography>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 0)}
              style={{ width: 80, padding: '6px 8px' }}
            />
          </Box>
        </Box>

        {/* Auto-computed dimensions info */}
        {imageDims && (
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              size="small"
              label={`Image: ${imageDims.w} x ${imageDims.h} px`}
              variant="outlined"
            />
            {computedTileW > 0 && computedTileH > 0 && (
              <>
                <Typography variant="body2" color="text.secondary">→</Typography>
                <Chip
                  size="small"
                  label={`Each tile: ${computedTileW} x ${computedTileH} px`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`${columns * rows} tiles total`}
                  variant="outlined"
                />
              </>
            )}
          </Box>
        )}

        {/* Slice preview canvas with grid overlay */}
        {imageDims && columns > 0 && rows > 0 && computedTileW > 0 && computedTileH > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Preview — grid lines show how tiles will be sliced
            </Typography>
            <SlicePreviewCanvas
              imageSrc={record.imagePath}
              columns={columns}
              rows={rows}
              tileW={computedTileW}
              tileH={computedTileH}
            />
          </Box>
        )}

        {/* Start tile ID and category */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Box>
            <Typography variant="caption" display="block">Start Tile ID</Typography>
            <input
              type="number"
              value={startTileId}
              onChange={(e) => setStartTileId(parseInt(e.target.value) || 0)}
              style={{ width: 100, padding: '6px 8px' }}
            />
          </Box>
          <Box>
            <Typography variant="caption" display="block">Category</Typography>
            <select
              value={categoryPrefix}
              onChange={(e) => setCategoryPrefix(e.target.value)}
              style={{ padding: '6px 8px' }}
            >
              <option value="terrain">Terrain</option>
              <option value="decoration">Decoration</option>
              <option value="obstacle">Obstacle</option>
            </select>
          </Box>
        </Box>

        {columns > 0 && rows > 0 && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Will create <strong>{columns * rows}</strong> tiles (IDs {startTileId}&ndash;{startTileId + columns * rows - 1})
          </Typography>
        )}

        <Button
          variant="contained"
          startIcon={<ContentCutIcon />}
          onClick={handleSlice}
          disabled={slicing || !columns || !rows}
          size="small"
        >
          {slicing ? 'Slicing & Cropping...' : 'Slice Spritesheet'}
        </Button>

        {sliceResult && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: sliceResult.startsWith('Error') ? 'error.main' : 'success.main' }}
          >
            {sliceResult}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Tiles list ─────────────────────────────────────────────────── */

function TilesetTilesPreview() {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Tiles in this Tileset
        </Typography>
        <ReferenceManyField reference="tiles" target="tilesetId" label={false}>
          <Datagrid bulkActionButtons={false} size="small">
            <NumberField source="tileId" label="ID" />
            <TextField source="name" />
            <FunctionField
              label="Grid Pos"
              render={(r: any) =>
                r?.spriteX != null && r?.spriteY != null ? `(${r.spriteX}, ${r.spriteY})` : '\u2014'
              }
            />
            <FunctionField
              label="Preview"
              render={(r: any) => {
                // If tile has its own spritePath (individually cropped), use it directly
                if (r?.spritePath) {
                  return (
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
                  );
                }
                // Fallback to colorHex
                if (r?.colorHex) {
                  return (
                    <Box
                      sx={{
                        width: 24, height: 24,
                        backgroundColor: r.colorHex.substring(0, 7),
                        border: '1px solid #ccc', borderRadius: '2px',
                      }}
                    />
                  );
                }
                return '\u2014';
              }}
            />
            <TextField source="category" />
          </Datagrid>
        </ReferenceManyField>
      </CardContent>
    </Card>
  );
}

/* ─── Delete section ─────────────────────────────────────────────── */

function DeleteTilesetSection() {
  const record = useRecordContext();
  const redirect = useRedirect();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'cascade' | 'keep' | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!record) return null;

  const handleDelete = async (cascade: boolean) => {
    setDeleting(true);
    try {
      const url = cascade
        ? `/api/tilesets/${record.id}?cascade=true`
        : `/api/tilesets/${record.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        redirect('list', 'tilesets');
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Delete error: ${err}`);
    } finally {
      setDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2, borderColor: 'error.light' }}>
        <CardContent>
          <Typography variant="subtitle2" color="error" gutterBottom>
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Deleting a tileset is permanent. Choose whether to also delete all child tile definitions
            or keep them (they will be detached from this tileset).
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              size="small"
              disabled={deleting}
              onClick={() => {
                setDeleteMode('cascade');
                setDialogOpen(true);
              }}
            >
              Delete + Remove Tiles
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DeleteIcon />}
              size="small"
              disabled={deleting}
              onClick={() => {
                setDeleteMode('keep');
                setDialogOpen(true);
              }}
            >
              Delete + Keep Tiles
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {deleteMode === 'cascade' ? 'Delete Tileset & All Tiles?' : 'Delete Tileset & Keep Tiles?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteMode === 'cascade'
              ? `This will permanently delete the tileset "${record.name}" and ALL tile definitions that belong to it. This cannot be undone.`
              : `This will delete the tileset "${record.name}" but keep all tile definitions. They will be detached (tilesetId set to null).`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(deleteMode === 'cascade')}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ─── Main edit page ─────────────────────────────────────────────── */

export default function TilesetEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" fullWidth helperText="Unique tileset name" />
        <NumberInput
          source="tileWidth"
          label="Tile Width (px)"
          helperText="Auto-calculated from spritesheet when slicing"
        />
        <NumberInput
          source="tileHeight"
          label="Tile Height (px)"
          helperText="Auto-calculated from spritesheet when slicing"
        />
        <TextInput source="description" multiline rows={3} fullWidth />

        <Divider sx={{ my: 2, width: '100%' }} />

        <SpritesheetUploadField />
        <SliceSection />
        <TilesetTilesPreview />

        <Divider sx={{ my: 2, width: '100%' }} />

        <DeleteTilesetSection />
      </SimpleForm>
    </Edit>
  );
}
