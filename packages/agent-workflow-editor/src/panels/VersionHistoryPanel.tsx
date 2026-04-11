import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, CircularProgress, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { diffWorkflows, formatDiffSummary } from '../utils/workflow-diff';
import type { DiffResult } from '../utils/workflow-diff';

interface Version {
  id: number;
  version: number;
  definition: Record<string, unknown>;
  description?: string;
  createdAt: string;
}

interface VersionHistoryPanelProps {
  workflowId: number;
  currentDefinition: Record<string, unknown>;
  onRestore: (definition: Record<string, unknown>) => void;
}

export function VersionHistoryPanel({ workflowId, currentDefinition, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<number | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Version | null>(null);

  useEffect(() => {
    fetch(`/api/agent-workflows/${workflowId}/versions?range=[0,49]&sort=["version","DESC"]`)
      .then(res => res.json())
      .then(data => { setVersions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workflowId]);

  const handleDiff = (version: Version) => {
    if (diffVersionId === version.id) {
      setDiffResult(null);
      setDiffVersionId(null);
    } else {
      const diff = diffWorkflows(
        version.definition as { states: Record<string, unknown> },
        currentDefinition as { states: Record<string, unknown> },
      );
      setDiffResult(diff);
      setDiffVersionId(version.id);
    }
  };

  const handleRestore = () => {
    if (restoreConfirm) {
      onRestore(restoreConfirm.definition);
      setRestoreConfirm(null);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>;
  }

  return (
    <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', bgcolor: 'white', overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Version History</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{versions.length} versions</Typography>
      </Box>

      {versions.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No versions saved yet</Typography>
        </Box>
      )}

      {versions.map((version, idx) => (
        <Box key={version.id} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip label={`v${version.version}`} size="small" color={idx === 0 ? 'primary' : 'default'} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {new Date(version.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {version.description && (
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              {version.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Button size="small" startIcon={<CompareArrowsIcon />} onClick={() => handleDiff(version)}
              variant={diffVersionId === version.id ? 'contained' : 'text'} sx={{ fontSize: 11, textTransform: 'none' }}>
              Diff
            </Button>
            <Button size="small" startIcon={<RestoreIcon />} onClick={() => setRestoreConfirm(version)}
              sx={{ fontSize: 11, textTransform: 'none' }}>
              Restore
            </Button>
          </Box>

          {diffVersionId === version.id && diffResult && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: 11 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDiffSummary(diffResult)}</Typography>
              {diffResult.addedNodes.length > 0 && <Box sx={{ color: 'success.main' }}>+ {diffResult.addedNodes.join(', ')}</Box>}
              {diffResult.removedNodes.length > 0 && <Box sx={{ color: 'error.main' }}>- {diffResult.removedNodes.join(', ')}</Box>}
              {diffResult.modifiedNodes.map(m => (
                <Box key={m.nodeId} sx={{ color: 'warning.main' }}>~ {m.nodeId}: {m.changes.map(c => c.field).join(', ')}</Box>
              ))}
            </Box>
          )}
        </Box>
      ))}

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreConfirm} onClose={() => setRestoreConfirm(null)}>
        <DialogTitle>Restore Version?</DialogTitle>
        <DialogContent>
          <Typography>This will replace the current definition with version {restoreConfirm?.version}. Unsaved changes will be lost.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirm(null)}>Cancel</Button>
          <Button onClick={handleRestore} variant="contained" color="warning">Restore</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
