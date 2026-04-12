'use client';

import { useState } from 'react';
import {
  useRecordContext,
  useDataProvider,
  useNotify,
  useRefresh,
} from 'react-admin';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface OverrideRow {
  id: number;
  serviceId: number;
  quota: number;
  reason: string | null;
}

export default function OverrideEditor() {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newServiceId, setNewServiceId] = useState('');
  const [newQuota, setNewQuota] = useState('');
  const [newReason, setNewReason] = useState('');

  const subscriptionId = record?.id;

  if (!loaded && subscriptionId) {
    dataProvider
      .getList('quota-overrides', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'id', order: 'ASC' },
        filter: { subscriptionId },
      })
      .then(({ data }: { data: OverrideRow[] }) => {
        setOverrides(data);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }

  if (!subscriptionId) return null;

  async function handleDelete(overrideId: number) {
    try {
      await dataProvider.delete('quota-overrides', {
        id: overrideId,
        previousData: { id: overrideId },
      });
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      notify('Override removed', { type: 'success' });
    } catch {
      notify('Failed to remove override', { type: 'error' });
    }
  }

  async function handleAdd() {
    if (!newServiceId || !newQuota) return;
    try {
      const { data } = await dataProvider.create('quota-overrides', {
        data: {
          subscriptionId,
          serviceId: Number(newServiceId),
          quota: Number(newQuota),
          reason: newReason || null,
        },
      });
      setOverrides((prev) => [...prev, data as OverrideRow]);
      setDialogOpen(false);
      setNewServiceId('');
      setNewQuota('');
      setNewReason('');
      notify('Override added', { type: 'success' });
      refresh();
    } catch {
      notify('Failed to add override', { type: 'error' });
    }
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Quota Overrides</Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          variant="outlined"
          onClick={() => setDialogOpen(true)}
        >
          Add Override
        </Button>
      </Box>

      {overrides.length === 0 && loaded ? (
        <Typography variant="body2" color="text.secondary">
          No overrides for this subscription.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service ID</TableCell>
              <TableCell>Quota</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {overrides.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.serviceId}</TableCell>
                <TableCell>{o.quota}</TableCell>
                <TableCell>{o.reason || '—'}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(o.id)}
                    aria-label="Delete override"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Add Quota Override</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
            <MuiTextField
              label="Service ID"
              type="number"
              value={newServiceId}
              onChange={(e) => setNewServiceId(e.target.value)}
              fullWidth
            />
            <MuiTextField
              label="Override Quota"
              type="number"
              value={newQuota}
              onChange={(e) => setNewQuota(e.target.value)}
              fullWidth
            />
            <MuiTextField
              label="Reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!newServiceId || !newQuota}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
