import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import TabletIcon from '@mui/icons-material/Tablet';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import RefreshIcon from '@mui/icons-material/Refresh';

type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<Viewport, number | '100%'> = {
  desktop: '100%',
  tablet: 768,
  mobile: 375,
};

interface PreviewPanelProps {
  flowSlug: string;
  pageSlug: string | null;
  onClose: () => void;
}

/**
 * Right-side panel showing an iframe preview of the portal page.
 * Requires the flow to be published for the preview to render.
 */
export function PreviewPanel({ flowSlug, pageSlug, onClose }: PreviewPanelProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const previewUrl = pageSlug
    ? `http://${flowSlug}.localhost:3000/${pageSlug}`
    : `http://${flowSlug}.localhost:3000/`;

  const iframeWidth = VIEWPORT_WIDTHS[viewport];

  return (
    <Box
      sx={{
        width: 480,
        borderLeft: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2">Preview</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ToggleButtonGroup
            value={viewport}
            exclusive
            onChange={(_, v) => v && setViewport(v as Viewport)}
            size="small"
          >
            <ToggleButton value="desktop" sx={{ px: 1 }}>
              <Tooltip title="Desktop">
                <DesktopWindowsIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="tablet" sx={{ px: 1 }}>
              <Tooltip title="Tablet (768px)">
                <TabletIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="mobile" sx={{ px: 1 }}>
              <Tooltip title="Mobile (375px)">
                <PhoneIphoneIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* URL bar */}
      <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {previewUrl}
        </Typography>
      </Box>

      {/* Preview iframe */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          overflow: 'auto',
          p: viewport === 'desktop' ? 0 : 2,
        }}
      >
        {!pageSlug && !flowSlug ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              Select a page to preview
            </Typography>
          </Box>
        ) : (
          <Box
            component="iframe"
            key={refreshKey}
            src={previewUrl}
            title="Page Preview"
            sx={{
              width: typeof iframeWidth === 'number' ? `${iframeWidth}px` : iframeWidth,
              height: '100%',
              border: viewport === 'desktop' ? 'none' : '1px solid',
              borderColor: 'divider',
              borderRadius: viewport === 'desktop' ? 0 : 1,
              bgcolor: 'white',
              boxShadow: viewport === 'desktop' ? 'none' : 3,
              transition: 'width 0.2s ease',
            }}
          />
        )}
      </Box>

      {/* Footer hint */}
      <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
          Preview requires the flow to be published. Save and publish to see changes.
        </Typography>
      </Box>
    </Box>
  );
}
