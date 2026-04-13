import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import { useUiFlowEditorStore } from '../store/UiFlowEditorProvider';
import { nodesToDefinition } from '../utils/definition-converter';
import { validateDefinition } from '../utils/validation';
import type { ValidationError } from '../utils/validation';

interface PublishButtonProps {
  maxPages?: number;
}

/**
 * Publish button with validation guardrail.
 * Before publishing, validates the current definition. If errors exist,
 * shows them in a dialog and blocks publish.
 */
export function PublishButton({ maxPages }: PublishButtonProps) {
  const nodes = useUiFlowEditorStore((s) => s.nodes);
  const edges = useUiFlowEditorStore((s) => s.edges);
  const navigation = useUiFlowEditorStore((s) => s.navigation);
  const settings = useUiFlowEditorStore((s) => s.settings);
  const flowName = useUiFlowEditorStore((s) => s.flowName);
  const publish = useUiFlowEditorStore((s) => s.publish);
  const saving = useUiFlowEditorStore((s) => s.saving);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [publishing, setPublishing] = useState(false);

  const handleClick = () => {
    const definition = nodesToDefinition(nodes, edges, navigation, settings);
    const result = validateDefinition(definition, maxPages);
    setErrors(result.errors);
    setDialogOpen(true);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publish();
      setDialogOpen(false);
    } catch {
      // Error is shown via store snackbar
    } finally {
      setPublishing(false);
    }
  };

  const hasErrors = errors.length > 0;

  return (
    <>
      <Button
        variant="contained"
        color="success"
        size="small"
        startIcon={<PublishIcon />}
        onClick={handleClick}
        disabled={saving}
        sx={{ textTransform: 'none' }}
      >
        Publish
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {hasErrors ? 'Cannot Publish' : 'Publish Portal'}
        </DialogTitle>
        <DialogContent>
          {hasErrors ? (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                The flow definition has {errors.length} validation{' '}
                {errors.length === 1 ? 'error' : 'errors'}. Fix them before
                publishing.
              </Alert>
              <List dense>
                {errors.map((err, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {err.path || '(root)'}
                        </Typography>
                      }
                      secondary={err.message}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <DialogContentText>
              Are you sure you want to publish <strong>{flowName}</strong>?
              This will make the portal live and accessible to tenants. A
              version snapshot will be saved automatically.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={publishing}>
            {hasErrors ? 'Close' : 'Cancel'}
          </Button>
          {!hasErrors && (
            <Button
              onClick={handlePublish}
              variant="contained"
              color="success"
              disabled={publishing}
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
