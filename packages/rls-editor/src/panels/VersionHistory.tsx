import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';

interface Version {
  id: number;
  version: number;
  description?: string;
  createdAt: string;
}

interface VersionHistoryProps {
  policyId: number;
  currentVersion: number;
  onRestore: (definition: unknown) => void;
  onClose: () => void;
}

export function VersionHistory({ policyId, currentVersion, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          sort: '["version","DESC"]',
          range: '[0,49]',
        });
        const res = await fetch(`/api/rls-policies/${policyId}/versions?${params}`);
        if (res.ok) {
          setVersions(await res.json());
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, [policyId, currentVersion]);

  const handleRestore = async (versionId: number) => {
    try {
      const res = await fetch(`/api/rls-policies/${policyId}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const restored = await res.json();
        onRestore(restored.definition);
      }
    } catch {
      // Handle error
    }
  };

  return (
    <Box
      sx={{
        width: 260,
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'auto',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Version History
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : versions.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            No version history yet
          </Typography>
        </Box>
      ) : (
        <List dense>
          {versions.map((v) => (
            <ListItem key={v.id} sx={{ pr: 6 }}>
              <ListItemText
                primary={`v${v.version}`}
                secondary={
                  <>
                    {v.description && (
                      <Typography variant="caption" display="block">
                        {v.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled">
                      {new Date(v.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  onClick={() => handleRestore(v.id)}
                  title="Restore this version"
                >
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
