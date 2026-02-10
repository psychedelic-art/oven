'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Autocomplete,
  Stack,
  Badge,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkIcon from '@mui/icons-material/Link';
import HearingIcon from '@mui/icons-material/Hearing';
import { Title } from 'react-admin';

// ─── Types ─────────────────────────────────────────────────

interface ParamSchema {
  type: string;
  description?: string;
  required?: boolean;
  example?: unknown;
}

interface ModuleInfo {
  name: string;
  dependencies: string[];
  resources: string[];
  apiRoutes: string[];
  events: {
    emits: string[];
    listens: string[];
    schemas: Record<string, Record<string, ParamSchema>>;
  };
  tableCount: number;
}

interface EventsInfo {
  emitters: Array<{ module: string; event: string }>;
  listeners: Array<{ module: string; event: string }>;
  registeredEvents: string[];
  schemas: Record<string, Record<string, ParamSchema>>;
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

interface TransformEntry {
  key: string;
  value: string;
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

// ─── Helper: Build all schemas from all modules ──────────

function buildGlobalSchemas(modules: ModuleInfo[]): Record<string, Record<string, ParamSchema>> {
  const schemas: Record<string, Record<string, ParamSchema>> = {};
  for (const mod of modules) {
    if (mod.events.schemas) {
      Object.assign(schemas, mod.events.schemas);
    }
  }
  return schemas;
}

// ─── Helper: Build listener → wirings index ──────────────

function buildListenerWiringIndex(
  modules: ModuleInfo[],
  wirings: Wiring[]
): Record<string, { module: string; event: string; wirings: Wiring[] }[]> {
  // Map: listenerEvent → [{ module, event, wirings that target this event }]
  const index: Record<string, { module: string; event: string; wirings: Wiring[] }[]> = {};
  for (const mod of modules) {
    for (const listenedEvent of mod.events.listens) {
      if (!index[listenedEvent]) {
        index[listenedEvent] = [];
      }
      // Find wirings where sourceEvent matches what this listener listens to
      const relatedWirings = wirings.filter(
        (w) => w.sourceEvent === listenedEvent && w.targetModule === mod.name
      );
      index[listenedEvent].push({
        module: mod.name,
        event: listenedEvent,
        wirings: relatedWirings,
      });
    }
  }
  return index;
}

// ─── Component: Param Schema Table ───────────────────────

function ParamSchemaDisplay({ schema, title }: { schema: Record<string, ParamSchema>; title?: string }) {
  const entries = Object.entries(schema);
  if (entries.length === 0) return <Typography variant="body2" color="text.secondary">No schema defined</Typography>;

  return (
    <Box>
      {title && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{title}</Typography>}
      <TableContainer sx={{ maxHeight: 200 }}>
        <Table size="small" sx={{ '& td, & th': { py: 0.25, px: 1, fontSize: 12 } }}>
          <TableHead>
            <TableRow>
              <TableCell><strong>Param</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Req</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(([key, param]) => (
              <TableRow key={key} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Box component="code" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>
                    $.{key}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={param.type} size="small" variant="outlined"
                    sx={{ height: 18, fontSize: 10,
                      borderColor: param.type === 'number' ? '#2196f3' : param.type === 'string' ? '#4caf50' : param.type === 'boolean' ? '#ff9800' : '#9e9e9e',
                      color: param.type === 'number' ? '#2196f3' : param.type === 'string' ? '#4caf50' : param.type === 'boolean' ? '#ff9800' : '#9e9e9e',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{param.description || '-'}</TableCell>
                <TableCell>{param.required ? '✱' : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Component: Transform Builder ────────────────────────

function TransformBuilder({
  sourceSchema,
  entries,
  onChange,
}: {
  sourceSchema: Record<string, ParamSchema>;
  entries: TransformEntry[];
  onChange: (entries: TransformEntry[]) => void;
}) {
  const sourceParams = Object.keys(sourceSchema).map((k) => `$.${k}`);

  const addEntry = () => onChange([...entries, { key: '', value: '' }]);
  const removeEntry = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          Transform (map source params to target payload)
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addEntry}>Add Field</Button>
      </Box>

      {entries.length === 0 && (
        <Alert severity="info" sx={{ fontSize: 12, py: 0 }}>
          No transform - source payload is passed through as-is
        </Alert>
      )}

      {entries.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Target key"
            value={entry.key}
            onChange={(e: any) => updateEntry(i, 'key', e.target.value)}
            sx={{ flex: 1 }}
            placeholder="e.g. playerId"
          />
          <ArrowForwardIcon color="action" sx={{ fontSize: 16 }} />
          <Autocomplete
            freeSolo
            size="small"
            options={sourceParams}
            value={entry.value}
            onInputChange={(_: any, val: string) => updateEntry(i, 'value', val)}
            renderInput={(params: any) => (
              <TextField
                {...params}
                label="Source value"
                placeholder="$.paramName or static"
              />
            )}
            renderOption={(props: any, option: string) => {
              const { key, ...rest } = props;
              const paramName = option.slice(2);
              const schema = sourceSchema[paramName];
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Box component="code" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{option}</Box>
                  {schema && (
                    <Box sx={{ ml: 2, fontSize: 11, color: 'text.secondary' }}>
                      {schema.type} - {schema.description || ''}
                    </Box>
                  )}
                </Box>
              );
            }}
            sx={{ flex: 1.5 }}
          />
          <IconButton size="small" onClick={() => removeEntry(i)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}

// ─── Component: Condition Builder ────────────────────────

function ConditionBuilder({
  sourceSchema,
  entries,
  onChange,
}: {
  sourceSchema: Record<string, ParamSchema>;
  entries: TransformEntry[];
  onChange: (entries: TransformEntry[]) => void;
}) {
  const sourceKeys = Object.keys(sourceSchema);

  const addEntry = () => onChange([...entries, { key: '', value: '' }]);
  const removeEntry = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          Condition (only fire if payload matches)
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addEntry}>Add Rule</Button>
      </Box>

      {entries.length === 0 && (
        <Alert severity="info" sx={{ fontSize: 12, py: 0 }}>
          No condition - wiring fires on every event
        </Alert>
      )}

      {entries.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <Autocomplete
            freeSolo
            size="small"
            options={sourceKeys}
            value={entry.key}
            onInputChange={(_: any, val: string) => updateEntry(i, 'key', val)}
            renderInput={(params: any) => (
              <TextField {...params} label="Payload key" placeholder="e.g. status" />
            )}
            renderOption={(props: any, option: string) => {
              const { key, ...rest } = props;
              const schema = sourceSchema[option];
              return (
                <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Box component="code" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{option}</Box>
                  {schema && (
                    <Box sx={{ ml: 2, fontSize: 11, color: 'text.secondary' }}>
                      {schema.type} - {schema.description || ''}
                    </Box>
                  )}
                </Box>
              );
            }}
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" sx={{ px: 0.5 }}>=</Typography>
          <TextField
            size="small"
            label="Expected value"
            value={entry.value}
            onChange={(e: any) => updateEntry(i, 'value', e.target.value)}
            sx={{ flex: 1 }}
            placeholder="e.g. active"
          />
          <IconButton size="small" onClick={() => removeEntry(i)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function ModuleManager() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [events, setEvents] = useState<EventsInfo | null>(null);
  const [wirings, setWirings] = useState<Wiring[]>([]);
  const [testEvent, setTestEvent] = useState('');
  const [testPayload, setTestPayload] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Wiring editor state
  const [wiringDialogOpen, setWiringDialogOpen] = useState(false);
  const [editingWiring, setEditingWiring] = useState<Partial<Wiring>>(EMPTY_WIRING);
  const [wiringError, setWiringError] = useState<string | null>(null);
  const [transformEntries, setTransformEntries] = useState<TransformEntry[]>([]);
  const [conditionEntries, setConditionEntries] = useState<TransformEntry[]>([]);

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

  // Build global schemas from all modules
  const globalSchemas = useMemo(() => buildGlobalSchemas(modules), [modules]);

  // Build listener → wirings index
  const listenerWiringIndex = useMemo(
    () => buildListenerWiringIndex(modules, wirings),
    [modules, wirings]
  );

  // Get source event schema for the current wiring
  const sourceEventSchema = useMemo(() => {
    if (!editingWiring.sourceEvent) return {};
    return globalSchemas[editingWiring.sourceEvent] || {};
  }, [editingWiring.sourceEvent, globalSchemas]);

  // Collect all available events from modules
  const allEmittedEvents = modules.flatMap((m) =>
    m.events.emits.map((e) => ({ module: m.name, event: e }))
  );

  // Collect all listener events
  const allListenerEvents = modules.flatMap((m) =>
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

  // ─── Wiring CRUD ──────────────────────────────────────

  const openNewWiring = (prefill?: Partial<Wiring>) => {
    setEditingWiring({ ...EMPTY_WIRING, ...prefill });
    setTransformEntries([]);
    setConditionEntries([]);
    setWiringError(null);
    setWiringDialogOpen(true);
  };

  const openEditWiring = (w: Wiring) => {
    setEditingWiring({ ...w });
    if (w.transform && typeof w.transform === 'object') {
      setTransformEntries(
        Object.entries(w.transform).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      );
    } else {
      setTransformEntries([]);
    }
    if (w.condition && typeof w.condition === 'object') {
      setConditionEntries(
        Object.entries(w.condition).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      );
    } else {
      setConditionEntries([]);
    }
    setWiringError(null);
    setWiringDialogOpen(true);
  };

  const saveWiring = async () => {
    try {
      const transform: Record<string, string> | null =
        transformEntries.length > 0
          ? Object.fromEntries(transformEntries.filter((e) => e.key).map((e) => [e.key, e.value]))
          : null;

      const condition: Record<string, string> | null =
        conditionEntries.length > 0
          ? Object.fromEntries(conditionEntries.filter((e) => e.key).map((e) => [e.key, e.value]))
          : null;

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
        transform,
        condition,
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

  const populateTestPayload = (eventName: string) => {
    setTestEvent(eventName);
    const schema = globalSchemas[eventName];
    if (schema) {
      const example: Record<string, unknown> = {};
      for (const [key, param] of Object.entries(schema)) {
        if (param.example !== undefined) {
          example[key] = param.example;
        } else if (param.type === 'number') {
          example[key] = 0;
        } else if (param.type === 'string') {
          example[key] = '';
        } else if (param.type === 'boolean') {
          example[key] = false;
        }
      }
      setTestPayload(JSON.stringify(example, null, 2));
    }
  };

  // Helper: find which module emits a given event
  const findEmitterModule = (eventName: string): string => {
    const emitter = allEmittedEvents.find((e) => e.event === eventName);
    return emitter?.module || '';
  };

  // Open wiring prefilled for a specific listener
  const openWiringForListener = (listenedEvent: string, listenerModule: string) => {
    const emitterModule = findEmitterModule(listenedEvent);
    openNewWiring({
      sourceModule: emitterModule,
      sourceEvent: listenedEvent,
      targetModule: listenerModule,
      targetAction: '',
      label: `${listenedEvent} → ${listenerModule}`,
    });
  };

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      <Title title="Module Manager" />

      {/* ─── Registered Modules ─── */}
      <Typography variant="h5" gutterBottom>Registered Modules</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Module</strong></TableCell>
              <TableCell><strong>Dependencies</strong></TableCell>
              <TableCell><strong>Tables</strong></TableCell>
              <TableCell><strong>Resources</strong></TableCell>
              <TableCell><strong>Routes</strong></TableCell>
              <TableCell><strong>Emits</strong></TableCell>
              <TableCell><strong>Listens</strong></TableCell>
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

      {/* ─── Event Catalog with Schemas ─── */}
      <Typography variant="h5" gutterBottom>Event Catalog</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click any emitted event to populate the test emitter. Click a listener to create or edit its wiring.
      </Typography>
      {modules.map((mod) => (
        <Accordion key={mod.name} sx={{ mb: 0.5 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{mod.name}</Typography>
            <Typography sx={{ ml: 2, color: 'text.secondary' }}>
              {mod.events.emits.length} emits, {mod.events.listens.length} listens
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 4 }}>
              {/* Emits Column */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>Emits:</Typography>
                {mod.events.emits.map((e) => {
                  const schema = globalSchemas[e];
                  // Count how many listeners this event has
                  const listenerCount = allListenerEvents.filter((l) => l.event === e).length;
                  const wiringCount = wirings.filter((w) => w.sourceEvent === e).length;
                  return (
                    <Box key={e} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Chip
                          label={e}
                          size="small"
                          color="success"
                          variant="outlined"
                          onClick={() => populateTestPayload(e)}
                          sx={{ cursor: 'pointer' }}
                        />
                        {schema && (
                          <Typography variant="caption" color="text.secondary">
                            ({Object.keys(schema).length} params)
                          </Typography>
                        )}
                        {listenerCount > 0 && (
                          <Tooltip title={`${listenerCount} listener(s), ${wiringCount} wiring(s)`}>
                            <Badge badgeContent={wiringCount} color="info" max={99}>
                              <HearingIcon fontSize="small" sx={{ color: 'info.main', fontSize: 16 }} />
                            </Badge>
                          </Tooltip>
                        )}
                      </Box>
                      {schema && (
                        <Box sx={{ ml: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                          <ParamSchemaDisplay schema={schema} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Listens Column - Enhanced with wiring edit */}
              <Box sx={{ flex: 0.6 }}>
                <Typography variant="subtitle2" color="info.main" sx={{ mb: 1 }}>
                  <HearingIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Listens to:
                </Typography>
                {mod.events.listens.length > 0
                  ? mod.events.listens.map((listenedEvent) => {
                      const sourceSchema = globalSchemas[listenedEvent];
                      const emitterMod = findEmitterModule(listenedEvent);
                      // Find existing wirings for this listener
                      const existingWirings = wirings.filter(
                        (w) => w.sourceEvent === listenedEvent && w.targetModule === mod.name
                      );

                      return (
                        <Box key={listenedEvent} sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <Chip
                              label={listenedEvent}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                            {emitterMod && (
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                                from {emitterMod}
                              </Typography>
                            )}
                          </Box>

                          {/* Show existing wirings for this listener */}
                          {existingWirings.length > 0 ? (
                            <Box sx={{ ml: 1, mt: 0.5 }}>
                              {existingWirings.map((w) => (
                                <Box
                                  key={w.id}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mb: 0.5,
                                    p: 0.5,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: w.enabled ? 'info.light' : 'action.disabled',
                                    bgcolor: w.enabled ? 'action.hover' : 'transparent',
                                    opacity: w.enabled ? 1 : 0.5,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.selected' },
                                  }}
                                  onClick={() => openEditWiring(w)}
                                >
                                  <LinkIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                  <Typography variant="caption" sx={{ flex: 1, fontWeight: 500 }}>
                                    {w.label || `Wiring #${w.id}`}
                                  </Typography>
                                  <Tooltip title={w.enabled ? 'Enabled' : 'Disabled'}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: w.enabled ? 'success.main' : 'action.disabled',
                                      }}
                                    />
                                  </Tooltip>
                                  <EditIcon sx={{ fontSize: 14, color: 'action.active' }} />
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Box sx={{ ml: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                                No wiring configured (uses built-in handler)
                              </Typography>
                            </Box>
                          )}

                          {/* Add wiring button */}
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<AddIcon />}
                            onClick={() => openWiringForListener(listenedEvent, mod.name)}
                            sx={{ ml: 1, mt: 0.25, fontSize: 11, textTransform: 'none' }}
                          >
                            Add wiring for this trigger
                          </Button>

                          {/* Show source event schema inline */}
                          {sourceSchema && (
                            <Box sx={{ ml: 1, mt: 0.5, p: 0.75, border: '1px dashed', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                                Incoming payload from {listenedEvent}:
                              </Typography>
                              <ParamSchemaDisplay schema={sourceSchema} />
                            </Box>
                          )}
                        </Box>
                      );
                    })
                  : <Typography variant="body2" color="text.secondary">None</Typography>}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Divider sx={{ my: 4 }} />

      {/* ─── Event Wirings ─── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Event Wirings</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openNewWiring()}>
          New Wiring
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect events to actions across modules. When a source event fires, the wiring transforms the payload and triggers the target.
      </Typography>

      {wirings.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No wirings configured yet. Click "New Wiring" to connect module events, or click "Add wiring" on any listener above.
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
                <TableCell><strong>Transform</strong></TableCell>
                <TableCell><strong>Enabled</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wirings.map((w) => (
                <TableRow key={w.id} sx={{ opacity: w.enabled ? 1 : 0.4 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {w.label || `Wiring #${w.id}`}
                    </Typography>
                    {w.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {w.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={w.sourceEvent} size="small" color="success" variant="outlined" />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {w.sourceModule}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center', px: 0.5 }}>
                    <ArrowForwardIcon color="action" fontSize="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={w.targetAction} size="small" color="info" variant="outlined" />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {w.targetModule}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {w.transform ? (
                      <Tooltip title={JSON.stringify(w.transform, null, 2)} arrow placement="top">
                        <Chip label={`${Object.keys(w.transform).length} fields`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">passthrough</Typography>
                    )}
                    {w.condition && (
                      <Tooltip title={`Condition: ${JSON.stringify(w.condition)}`} arrow placement="top">
                        <Chip label="filtered" size="small" color="warning" variant="outlined" sx={{ ml: 0.5, fontSize: 11 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={w.enabled} onChange={() => toggleWiring(w)} size="small" />
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

      <Divider sx={{ my: 4 }} />

      {/* ─── Test Event Emitter ─── */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Test Event Emitter</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select an event from the catalog above or type manually. The payload auto-populates from the event schema.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Autocomplete
              freeSolo
              size="small"
              options={allEmittedEvents.map((e) => e.event)}
              value={testEvent}
              onInputChange={(_: any, val: string) => {
                setTestEvent(val);
                if (globalSchemas[val]) {
                  const example: Record<string, unknown> = {};
                  for (const [kk, param] of Object.entries(globalSchemas[val])) {
                    example[kk] = param.example !== undefined ? param.example : param.type === 'number' ? 0 : param.type === 'boolean' ? false : '';
                  }
                  setTestPayload(JSON.stringify(example, null, 2));
                }
              }}
              renderInput={(params: any) => (
                <TextField {...params} label="Event Name" placeholder="e.g. maps.config.activated" />
              )}
              renderOption={(props: any, option: string) => {
                const { key, ...rest } = props;
                const schema = globalSchemas[option];
                return (
                  <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{option}</span>
                    {schema && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {Object.keys(schema).length} params
                      </Typography>
                    )}
                  </Box>
                );
              }}
              sx={{ minWidth: 350 }}
            />
            <TextField
              label="Payload (JSON)"
              value={testPayload}
              onChange={(e: any) => setTestPayload(e.target.value)}
              size="small"
              sx={{ minWidth: 350 }}
              multiline
              maxRows={5}
            />
            <Button variant="contained" onClick={fireTestEvent} disabled={!testEvent}>
              Fire Event
            </Button>
          </Box>

          {testEvent && globalSchemas[testEvent] && (
            <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
              <ParamSchemaDisplay schema={globalSchemas[testEvent]} title={`Schema for ${testEvent}`} />
            </Box>
          )}

          {testResult && (
            <Alert severity="info" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {testResult}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ─── Recent Event Log ─── */}
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
                    <TableCell>Payload</TableCell>
                    <TableCell>Handlers</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.recentLog.slice().reverse().map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={entry.event} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={JSON.stringify(entry.payload, null, 2)} arrow placement="top">
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', cursor: 'help', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {JSON.stringify(entry.payload)}
                          </Typography>
                        </Tooltip>
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
      <Dialog open={wiringDialogOpen} onClose={() => setWiringDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingWiring.id ? 'Edit Wiring' : 'New Event Wiring'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Label"
              value={editingWiring.label ?? ''}
              onChange={(e: any) => setEditingWiring({ ...editingWiring, label: e.target.value })}
              size="small"
              placeholder="e.g. Auto-assign map on session start"
            />

            {/* Source */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1.5 }}>
                Source (When this event fires...)
              </Typography>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Source Module</InputLabel>
                  <Select
                    value={editingWiring.sourceModule ?? ''}
                    label="Source Module"
                    onChange={(e: any) => setEditingWiring({
                      ...editingWiring,
                      sourceModule: e.target.value,
                      sourceEvent: '',
                    })}
                  >
                    {modules.map((m) => (
                      <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1.5 }}>
                  <InputLabel>Source Event</InputLabel>
                  <Select
                    value={editingWiring.sourceEvent ?? ''}
                    label="Source Event"
                    onChange={(e: any) => {
                      setEditingWiring({ ...editingWiring, sourceEvent: e.target.value });
                      setTransformEntries([]);
                    }}
                  >
                    {allEmittedEvents
                      .filter((e) => !editingWiring.sourceModule || e.module === editingWiring.sourceModule)
                      .map((e) => (
                        <MenuItem key={e.event} value={e.event}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{e.event}</span>
                            {globalSchemas[e.event] && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                {Object.keys(globalSchemas[e.event]).length} params
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Stack>

              {editingWiring.sourceEvent && Object.keys(sourceEventSchema).length > 0 && (
                <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <InfoOutlinedIcon fontSize="small" color="success" />
                    <Typography variant="caption" fontWeight="bold" color="success.main">
                      Source Event Payload
                    </Typography>
                  </Box>
                  <ParamSchemaDisplay schema={sourceEventSchema} />
                </Box>
              )}
            </Paper>

            {/* Target */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="info.main" sx={{ mb: 1.5 }}>
                Target (...trigger this action)
              </Typography>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Target Module</InputLabel>
                  <Select
                    value={editingWiring.targetModule ?? ''}
                    label="Target Module"
                    onChange={(e: any) => setEditingWiring({
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
                  onChange={(e: any) => setEditingWiring({ ...editingWiring, targetAction: e.target.value })}
                  size="small"
                  sx={{ flex: 1.5 }}
                  placeholder="e.g. player.notified"
                  helperText="Event emitted on target module"
                />
              </Stack>
            </Paper>

            {/* Transform Builder */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <TransformBuilder
                sourceSchema={sourceEventSchema}
                entries={transformEntries}
                onChange={setTransformEntries}
              />
            </Paper>

            {/* Condition Builder */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <ConditionBuilder
                sourceSchema={sourceEventSchema}
                entries={conditionEntries}
                onChange={setConditionEntries}
              />
            </Paper>

            <TextField
              label="Description"
              value={editingWiring.description ?? ''}
              onChange={(e: any) => setEditingWiring({ ...editingWiring, description: e.target.value })}
              size="small"
              multiline
              rows={2}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingWiring.enabled ?? true}
                  onChange={(e: any) => setEditingWiring({ ...editingWiring, enabled: e.target.checked })}
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
