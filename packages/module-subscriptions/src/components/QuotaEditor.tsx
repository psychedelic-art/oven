'use client';

import { useState } from 'react';
import {
  useRecordContext,
  useDataProvider,
  useNotify,
  useRefresh,
  ReferenceField,
  TextField,
  NumberField,
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
  Select,
  MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface QuotaRow {
  id: number;
  serviceId: number;
  quota: number;
  period: string;
  pricePerUnit: number | null;
}

export default function QuotaEditor() {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const [quotas, setQuotas] = useState<QuotaRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newServiceId, setNewServiceId] = useState('');
  const [newQuota, setNewQuota] = useState('');
  const [newPeriod, setNewPeriod] = useState('monthly');

  const planId = record?.id;

  // Load quotas on first render
  if (!loaded && planId) {
    dataProvider
      .getList('plan-quotas', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'id', order: 'ASC' },
        filter: { planId },
      })
      .then(({ data }: { data: QuotaRow[] }) => {
        setQuotas(data);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }

  if (!planId) return null;

  async function handleDelete(quotaId: number) {
    try {
      await dataProvider.delete('plan-quotas', {
        id: quotaId,
        previousData: { id: quotaId },
      });
      setQuotas((prev) => prev.filter((q) => q.id !== quotaId));
      notify('Quota removed', { type: 'success' });
    } catch {
      notify('Failed to remove quota', { type: 'error' });
    }
  }

  async function handleAdd() {
    if (!newServiceId || !newQuota) return;
    try {
      const { data } = await dataProvider.create('plan-quotas', {
        data: {
          planId,
          serviceId: Number(newServiceId),
          quota: Number(newQuota),
          period: newPeriod,
        },
      });
      setQuotas((prev) => [...prev, data as QuotaRow]);
      setDialogOpen(false);
      setNewServiceId('');
      setNewQuota('');
      setNewPeriod('monthly');
      notify('Quota added', { type: 'success' });
      refresh();
    } catch {
      notify('Failed to add quota', { type: 'error' });
    }
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Plan Quotas</Typography>
        <Button
          startIcon={<AddIcon />}
          size="small"
          variant="outlined"
          onClick={() => setDialogOpen(true)}
        >
          Add Quota
        </Button>
      </Box>

      {quotas.length === 0 && loaded ? (
        <Typography variant="body2" color="text.secondary">
          No quotas defined for this plan.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service ID</TableCell>
              <TableCell>Quota</TableCell>
              <TableCell>Period</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {quotas.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.serviceId}</TableCell>
                <TableCell>{q.quota}</TableCell>
                <TableCell>{q.period}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(q.id)}
                    aria-label="Delete quota"
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
        <DialogTitle>Add Quota</DialogTitle>
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
              label="Quota"
              type="number"
              value={newQuota}
              onChange={(e) => setNewQuota(e.target.value)}
              fullWidth
            />
            <Select
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              fullWidth
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
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
