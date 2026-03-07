import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import type { FlowVersion, PersistenceAdapter } from '../store/types';

interface VersionHistoryPanelProps {
  flowId: number;
  adapter: PersistenceAdapter;
  onRestore: () => void;
  onClose: () => void;
}

/**
 * Right-side panel showing published version history with restore capability.
 */
export function VersionHistoryPanel({ flowId, adapter, onRestore, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      if (!adapter.listVersions) {
        setError('Version history is not available.');
        setLoading(false);
        return;
      }
      try {
        const data = await adapter.listVersions(flowId);
        setVersions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      } finally {
        setLoading(false);
      }
    }
    fetchVersions();
  }, [flowId, adapter]);

  const handleRestore = async (versionId: number) => {
    if (!adapter.restoreVersion) return;
    setRestoring(versionId);
    try {
      await adapter.restoreVersion(flowId, versionId);
      onRestore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">Version History</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && !error && versions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No published versions yet. Publish your flow to create a version snapshot.
        </Typography>
      )}

      {!loading && versions.length > 0 && (
        <List dense disablePadding>
          {versions.map((version, index) => (
            <React.Fragment key={version.id}>
              <ListItem
                disableGutters
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 0.5 }}>
                  <Chip
                    label={`v${version.version}`}
                    size="small"
                    color={index === 0 ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                  {index === 0 && (
                    <Chip label="Latest" size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  )}
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(version.createdAt)}
                    </Typography>
                  }
                  secondary={
                    version.description && (
                      <Typography variant="caption" sx={{ fontSize: 10 }}>
                        {version.description}
                      </Typography>
                    )
                  }
                />
                {adapter.restoreVersion && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestoreIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleRestore(version.id)}
                    disabled={restoring !== null}
                    sx={{ mt: 0.5, fontSize: 11, textTransform: 'none' }}
                  >
                    {restoring === version.id ? 'Restoring...' : 'Restore'}
                  </Button>
                )}
              </ListItem>
              {index < versions.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
}
