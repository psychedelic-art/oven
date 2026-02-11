import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';

interface VersionEntry {
  id: number;
  workflowId: number;
  version: number;
  definition: unknown;
  description: string | null;
  createdAt: string;
}

interface VersionHistoryProps {
  workflowId: number;
  currentVersion: number;
  onRestore?: (definition: unknown) => void;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function VersionHistory({
  workflowId,
  currentVersion,
  onRestore,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [viewVersion, setViewVersion] = useState<VersionEntry | null>(null);

  // Fetch version history
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          sort: '["version","DESC"]',
          range: '[0,49]',
        });
        const res = await fetch(`/api/workflows/${workflowId}/versions?${params}`);
        if (!res.ok) throw new Error('Failed to load versions');
        const data = await res.json();
        setVersions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [workflowId]);

  const handleRestore = async (version: VersionEntry) => {
    if (!confirm(`Restore workflow to version ${version.version}? The current version will be saved as a snapshot.`)) {
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/versions/${version.id}/restore`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error('Restore failed');
      const result = await res.json();
      if (onRestore) {
        onRestore(result.definition);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <HistoryIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
          Version History
        </Typography>
        <Chip label={`Current: v${currentVersion}`} size="small" color="primary" variant="outlined" />
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : versions.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No previous versions yet.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Versions are created automatically when you save changes.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {versions.map((v, i) => (
              <React.Fragment key={v.id}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', mb: 0.5 }}>
                    <Chip
                      label={`v${v.version}`}
                      size="small"
                      sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                      color="default"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {timeAgo(v.createdAt)}
                    </Typography>
                  </Box>

                  {v.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      {v.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setViewVersion(v)}
                      sx={{ fontSize: 11, textTransform: 'none', minWidth: 0 }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<RestoreIcon />}
                      onClick={() => handleRestore(v)}
                      disabled={restoring}
                      color="warning"
                      sx={{ fontSize: 11, textTransform: 'none', minWidth: 0 }}
                    >
                      Restore
                    </Button>
                  </Box>
                </ListItem>
                {i < versions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* View Version Dialog */}
      <Dialog
        open={!!viewVersion}
        onClose={() => setViewVersion(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Version {viewVersion?.version} Definition
        </DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 500,
              fontSize: 11,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {viewVersion ? JSON.stringify(viewVersion.definition, null, 2) : ''}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewVersion(null)}>Close</Button>
          {viewVersion && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<RestoreIcon />}
              onClick={() => {
                handleRestore(viewVersion);
                setViewVersion(null);
              }}
              disabled={restoring}
            >
              Restore This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
