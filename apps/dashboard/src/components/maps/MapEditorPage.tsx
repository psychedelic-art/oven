'use client';

import { useParams, useNavigate } from 'react-router-dom';
import { MapEditor } from '@oven/map-editor';
import { Button, Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * React Admin custom route page that wraps the @oven/map-editor package.
 * Route: /maps/:id/editor
 */
export default function MapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mapId = parseInt(id || '0', 10);

  if (!mapId) {
    return (
      <Box p={3}>
        <Typography color="error">Invalid map ID</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/maps/${mapId}/show`)}
        >
          Back to Map
        </Button>
        <Typography variant="subtitle2" sx={{ ml: 1 }}>
          Map Editor — #{mapId}
        </Typography>
      </Box>

      {/* Editor fills remaining space */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <MapEditor mapId={mapId} apiBase="/api" />
      </Box>
    </Box>
  );
}
