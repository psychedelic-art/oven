import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  onPublish: () => Promise<void>;
  flowName: string;
}

/**
 * Confirmation dialog before publishing a UI flow to production.
 */
export function PublishDialog({ open, onClose, onPublish, flowName }: PublishDialogProps) {
  const [publishing, setPublishing] = React.useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
      onClose();
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Publish Portal</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to publish <strong>{flowName}</strong>?
          This will make the portal live and accessible to tenants.
          A version snapshot will be saved automatically.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={publishing}>
          Cancel
        </Button>
        <Button
          onClick={handlePublish}
          variant="contained"
          color="success"
          disabled={publishing}
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
