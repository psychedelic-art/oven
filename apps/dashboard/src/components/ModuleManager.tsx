'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  TextField,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Title } from 'react-admin';

interface ModuleInfo {
  name: string;
  dependencies: string[];
  resources: string[];
  apiRoutes: string[];
  events: { emits: string[]; listens: string[] };
  tableCount: number;
}

interface EventsInfo {
  emitters: Array<{ module: string; event: string }>;
  listeners: Array<{ module: string; event: string }>;
  registeredEvents: string[];
  recentLog: Array<{
    event: string;
    payload: Record<string, unknown>;
    timestamp: number;
    results: Array<{ handler: string; success: boolean; error?: string }>;
  }>;
}

interface Wiring {
  id: number;
  sourceModule: string;
  sourceEvent: string;
  targetModule: string;
  targetAction: string;
  transform: Record<string, unknown> | null;
  condition: Record<string, unknown> | null;
  label: string | null;
  description: string | null;
  enabled: boolean;
  createdAt: string;
}

const EMPTY_WIRING: Omit<Wiring, 'id' | 'createdAt'> = {
  sourceModule: '',
  sourceEvent: '',
  targetModule: '',
  targetAction: '',
  transform: null,
  condition: null,
  label: '',
  description: '',
  enabled: true,
};

export default function ModuleManager() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [events, setEvents] = useState<EventsInfo | null>(null);
  const [wirings, setWirings] = useState<Wiring[]>([]);
  const [testEvent, setTestEvent] = useState('');
  const [testPayload, setTestPayload] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Wiring editor dialog
  const [wiringDialogOpen, setWiringDialogOpen] = useState(false);
  const [editingWiring, setEditingWiring] = useState<Partial<Wiring>>(EMPTY_WIRING);
  const [wiringError, setWiringError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [modsRes, eventsRes, wiringsRes] = await Promise.all([
      fetch('/api/modules'),
      fetch('/api/events'),
      fetch('/api/event-wirings'),
    ]);
    setModules(await modsRes.json());
    setEvents(await eventsRes.json());
    setWirings(await wiringsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Collect all available events and actions from modules
  const allEmittedEvents = modules.flatMap((m) =>
    m.events.emits.map((e) => ({ module: m.name, event: e }))
  );
  const allListenedEvents = modules.flatMap((m) =>
    m.events.listens.map((e) => ({ module: m.name, event: e }))
  );

  const fireTestEvent = async () => {
    try {
      const payload = JSON.parse(testPayload);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: testEvent, payload }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
      fetchData();
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ─── Wiring CRUD ───────────────────────────────────────────
  const openNewWiring = () => {
    setEditingWiring({ ...EMPTY_WIRING });
    setWiringError(null);
    setWiringDialogOpen(true);
  };

  const openEditWiring = (w: Wiring) => {
    setEditingWiring({ ...w });
    setWiringError(null);
    setWiringDialogOpen(true);
  };

  const saveWiring = async () => {
    try {
      const isNew = !editingWiring.id;
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew
        ? '/api/event-wirings'
        : `/api/event-wirings/${editingWiring.id}`;

      const body = {
        sourceModule: editingWiring.sourceModule,
        sourceEvent: editingWiring.sourceEvent,
        targetModule: editingWiring.targetModule,
        targetAction: editingWiring.targetAction,
        label: editingWiring.label || null,
        description: editingWiring.description || null,
        enabled: editingWiring.enabled ?? true,
        transform: editingWiring.transform,
        condition: editingWiring.condition,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setWiringError(err.error || 'Failed to save');
        return;
      }

      setWiringDialogOpen(false);
      fetchData();
    } catch (err) {
      setWiringError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteWiring = async (id: number) => {
    await fetch(`/api/event-wirings/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const toggleWiring = async (w: Wiring) => {
    await fetch(`/api/event-wirings/${w.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...w, enabled: !w.enabled }),
    });
    fetchData();
  };

  // Get unique source events for the wiring dropdown
  const sourceEventOptions = allEmittedEvents.map(
    (e) => `${e.event}`
  );
  // Build target action options from listened events
  const targetActionOptions = allListenedEvents.map(
    (e) => ({ module: e.module, action: e.event.split('.').slice(1).join('.'), fullEvent: e.event })
  );

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      <Title title="Module Manager" />

      {/* Registered Modules */}
      <Typography variant="h5" gutterBottom>Registered Modules</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Module</strong></TableCell>
              <TableCell><strong>Dependencies</strong></TableCell>
              <TableCell><strong>Tables</strong></TableCell>
              <TableCell><strong>Resources</strong></TableCell>
              <TableCell><strong>API Routes</strong></TableCell>
              <TableCell><strong>Events Emitted</strong></TableCell>
              <TableCell><strong>Events Listened</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((mod) => (
              <TableRow key={mod.name}>
                <TableCell>
                  <Chip label={mod.name} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  {mod.dependencies.length > 0
                    ? mod.dependencies.map((d) => (
                        <Chip key={d} label={d} size="small" sx={{ mr: 0.5 }} />
                      ))
                    : '—'}
                </TableCell>
                <TableCell>{mod.tableCount}</TableCell>
                <TableCell>
                  {mod.resources.map((r) => (
                    <Chip key={r} label={r} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{mod.apiRoutes.length}</TableCell>
                <TableCell>{mod.events.emits.length}</TableCell>
                <TableCell>{mod.events.listens.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Event Graph */}
      <Typography variant="h5" gutterBottom>Event Graph</Typography>
      {modules.map((mod) => (
        <Accordion key={mod.name}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{mod.name}</Typography>
            <Typography sx={{ ml: 2, color: 'text.secondary' }}>
              {mod.events.emits.length} emits, {mod.events.listens.length} listens
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box>
                <Typography variant="subtitle2" color="success.main">Emits:</Typography>
                {mod.events.emits.map((e) => (
                  <Chip
                    key={e}
                    label={e}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                    onClick={() => setTestEvent(e)}
                  />
                ))}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="info.main">Listens to:</Typography>
                {mod.events.listens.length > 0
                  ? mod.events.listens.map((e) => (
                      <Chip key={e} label={e} size="small" color="info" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))
                  : <Typography variant="body2" color="text.secondary">None</Typography>}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Divider sx={{ my: 4 }} />

      {/* ─── Event Wirings (State Machine) ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Event Wirings</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openNewWiring}
        >
          New Wiring
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect module events to actions. When a source event fires, the target action is triggered automatically.
      </Typography>

      {wirings.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No wirings configured yet. Click "New Wiring" to connect module events.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Label</strong></TableCell>
                <TableCell><strong>Source Event</strong></TableCell>
                <TableCell />
                <TableCell><strong>Target Action</strong></TableCell>
                <TableCell><strong>Enabled</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wirings.map((w) => (
                <TableRow key={w.id} sx={{ opacity: w.enabled ? 1 : 0.5 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {w.label || `Wiring #${w.id}`}
                    </Typography>
                    {w.description && (
                      <Typography variant="caption" color="text.secondary">
                        {w.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={w.sourceEvent}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {w.sourceModule}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon color="action" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={w.targetAction}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {w.targetModule}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={w.enabled}
                      onChange={() => toggleWiring(w)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditWiring(w)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => deleteWiring(w.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Wiring conditions/transforms summary */}
      {wirings.some((w) => w.transform || w.condition) && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Wiring Details (Transforms & Conditions)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {wirings.filter((w) => w.transform || w.condition).map((w) => (
              <Box key={w.id} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2">{w.label || `Wiring #${w.id}`}</Typography>
                {w.condition && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="warning.main">Condition:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {JSON.stringify(w.condition)}
                    </Typography>
                  </Box>
                )}
                {w.transform && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="info.main">Transform:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {JSON.stringify(w.transform)}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Test Event Emitter */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Test Event Emitter</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Event Name"
              value={testEvent}
              onChange={(e) => setTestEvent(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              placeholder="e.g. maps.config.activated"
            />
            <TextField
              label="Payload (JSON)"
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              placeholder='{"key": "value"}'
            />
            <Button
              variant="contained"
              onClick={fireTestEvent}
              disabled={!testEvent}
            >
              Fire Event
            </Button>
          </Box>
          {testResult && (
            <Alert severity="info" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {testResult}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Event Log */}
      {events && events.recentLog.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Event Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Handlers</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.recentLog.slice().reverse().map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontSize: 12 }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={entry.event} size="small" />
                      </TableCell>
                      <TableCell>{entry.results.length}</TableCell>
                      <TableCell>
                        {entry.results.every((r) => r.success)
                          ? <Chip label="OK" size="small" color="success" />
                          : <Chip label="FAILED" size="small" color="error" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ─── Wiring Editor Dialog ─── */}
      <Dialog open={wiringDialogOpen} onClose={() => setWiringDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWiring.id ? 'Edit Wiring' : 'New Event Wiring'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Label"
              value={editingWiring.label ?? ''}
              onChange={(e) => setEditingWiring({ ...editingWiring, label: e.target.value })}
              size="small"
              placeholder="e.g. Log player when map activates"
            />

            {/* Source */}
            <Typography variant="subtitle2" color="success.main">Source (When this event fires...)</Typography>
            <FormControl size="small">
              <InputLabel>Source Module</InputLabel>
              <Select
                value={editingWiring.sourceModule ?? ''}
                label="Source Module"
                onChange={(e) => setEditingWiring({
                  ...editingWiring,
                  sourceModule: e.target.value,
                  sourceEvent: '', // reset event when module changes
                })}
              >
                {modules.map((m) => (
                  <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Source Event</InputLabel>
              <Select
                value={editingWiring.sourceEvent ?? ''}
                label="Source Event"
                onChange={(e) => setEditingWiring({ ...editingWiring, sourceEvent: e.target.value })}
              >
                {allEmittedEvents
                  .filter((e) => !editingWiring.sourceModule || e.module === editingWiring.sourceModule)
                  .map((e) => (
                    <MenuItem key={e.event} value={e.event}>{e.event}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Target */}
            <Typography variant="subtitle2" color="info.main">Target (...trigger this action)</Typography>
            <FormControl size="small">
              <InputLabel>Target Module</InputLabel>
              <Select
                value={editingWiring.targetModule ?? ''}
                label="Target Module"
                onChange={(e) => setEditingWiring({
                  ...editingWiring,
                  targetModule: e.target.value,
                  targetAction: '',
                })}
              >
                {modules.map((m) => (
                  <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Target Action"
              value={editingWiring.targetAction ?? ''}
              onChange={(e) => setEditingWiring({ ...editingWiring, targetAction: e.target.value })}
              size="small"
              placeholder="e.g. player.notified or any event name"
              helperText="The event name to emit on the target module (e.g. maps.config.activated)"
            />

            <TextField
              label="Description"
              value={editingWiring.description ?? ''}
              onChange={(e) => setEditingWiring({ ...editingWiring, description: e.target.value })}
              size="small"
              multiline
              rows={2}
            />

            <TextField
              label="Condition (JSON, optional)"
              value={editingWiring.condition ? JSON.stringify(editingWiring.condition) : ''}
              onChange={(e) => {
                try {
                  setEditingWiring({ ...editingWiring, condition: e.target.value ? JSON.parse(e.target.value) : null });
                } catch {
                  // allow typing invalid JSON temporarily
                }
              }}
              size="small"
              placeholder='{"status": "active"}'
              helperText="Only trigger if payload matches these key-value pairs"
            />

            <TextField
              label="Transform (JSON, optional)"
              value={editingWiring.transform ? JSON.stringify(editingWiring.transform) : ''}
              onChange={(e) => {
                try {
                  setEditingWiring({ ...editingWiring, transform: e.target.value ? JSON.parse(e.target.value) : null });
                } catch {
                  // allow typing invalid JSON temporarily
                }
              }}
              size="small"
              placeholder='{"playerId": "$.id"}'
              helperText="Map source payload keys to target payload. Use $.key for extraction"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingWiring.enabled ?? true}
                  onChange={(e) => setEditingWiring({ ...editingWiring, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />

            {wiringError && <Alert severity="error">{wiringError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWiringDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveWiring}
            disabled={!editingWiring.sourceEvent || !editingWiring.targetModule || !editingWiring.targetAction}
          >
            {editingWiring.id ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
