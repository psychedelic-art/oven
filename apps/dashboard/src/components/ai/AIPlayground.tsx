'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Slider,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Pagination,
  InputAdornment,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FileUploader, FilePickerCombobox, FilePicker, useFileUpload } from '../files';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { SyntheticEvent, Dispatch, SetStateAction } from 'react';

// ─── Session State Persistence ───────────────────────────────

function useSessionState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `playground:${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // sessionStorage full or unavailable
    }
  }, [storageKey, value]);

  return [value, setValue];
}

// ─── Types ───────────────────────────────────────────────────

interface PlaygroundExecution {
  id: number;
  type: string;
  model: string | null;
  input: Record<string, unknown>;
  output: unknown;
  status: string;
  latencyMs: number | null;
  createdAt: string;
}

interface ParameterField {
  type: 'number' | 'integer' | 'select' | 'boolean' | 'string';
  label: string;
  description?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

interface AiAlias {
  id: number;
  alias: string;
  providerId: number;
  modelId: string;
  type: string;
  enabled: boolean;
  parametersSchema: Record<string, ParameterField> | null;
  defaultSettings: Record<string, unknown> | null;
}

interface AiProvider {
  id: number;
  name: string;
  slug: string;
  type: string;
  hasApiKey: boolean;
  enabled: boolean;
}

interface UsageInfo {
  tokens?: { input?: number; output?: number; total?: number };
  costCents?: number;
  latencyMs?: number;
  model?: string;
  provider?: string;
}

// ─── Friendly Error Messages ─────────────────────────────────

function friendlyError(message: string): string {
  if (message.includes('environment variable is not set') || message.includes('API_KEY')) {
    return 'Configure API key in AI Providers';
  }
  if (message.includes('is not configured')) {
    return 'Add API key for this provider in AI Providers';
  }
  return message;
}

// ─── History Tracking Helper ─────────────────────────────────

async function saveExecution(record: {
  type: string;
  model?: string;
  input: Record<string, unknown>;
  output: unknown;
  status: string;
  latencyMs: number;
}) {
  try {
    await fetch('/api/ai-playground-executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch {
    // silently ignore save failures
  }
}

// ─── Shared Hooks ────────────────────────────────────────────

function useAliasesAndProviders() {
  const [aliases, setAliases] = useState<AiAlias[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [aliasRes, providerRes] = await Promise.all([
          fetch('/api/ai-aliases?range=[0,99]'),
          fetch('/api/ai-providers?range=[0,99]'),
        ]);
        if (cancelled) return;
        const aliasData = aliasRes.ok ? await aliasRes.json() : [];
        const providerData = providerRes.ok ? await providerRes.json() : [];
        setAliases(Array.isArray(aliasData) ? aliasData : []);
        setProviders(Array.isArray(providerData) ? providerData : []);
      } catch {
        // ignore fetch errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const textAliases = useMemo(
    () => aliases.filter((a) => a.type === 'text' && a.enabled),
    [aliases]
  );
  const embeddingAliases = useMemo(
    () => aliases.filter((a) => a.type === 'embedding' && a.enabled),
    [aliases]
  );
  const imageAliases = useMemo(
    () => aliases.filter((a) => a.type === 'image' && a.enabled),
    [aliases]
  );
  const audioAliases = useMemo(
    () => aliases.filter((a) => a.type === 'audio' && a.enabled),
    [aliases]
  );
  const hasConnectedProvider = useMemo(
    () => providers.some((p) => p.hasApiKey && p.enabled),
    [providers]
  );

  return { aliases, textAliases, embeddingAliases, imageAliases, audioAliases, providers, hasConnectedProvider, loading };
}

// ─── Dynamic Parameters Hook ─────────────────────────────────

function useDynamicParams(aliases: AiAlias[], selectedAlias: string) {
  const alias = useMemo(
    () => aliases.find((a) => a.alias === selectedAlias),
    [aliases, selectedAlias]
  );
  const schema = alias?.parametersSchema ?? null;

  const [params, setParams] = useState<Record<string, unknown>>({});

  // Reset params when alias changes
  useEffect(() => {
    if (!alias) { setParams({}); return; }
    const defaults: Record<string, unknown> = {};
    // First apply schema defaults
    if (alias.parametersSchema) {
      for (const [key, field] of Object.entries(alias.parametersSchema)) {
        if (field.default !== undefined) defaults[key] = field.default;
      }
    }
    // Then override with alias defaultSettings
    if (alias.defaultSettings) {
      Object.assign(defaults, alias.defaultSettings);
    }
    setParams(defaults);
  }, [alias]);

  const setParam = useCallback((key: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { params, setParam, schema };
}

// ─── Dynamic Parameter Form ─────────────────────────────────

function DynamicParameterForm({
  schema,
  values,
  onChange,
}: {
  schema: Record<string, ParameterField> | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (!schema || Object.keys(schema).length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
      {Object.entries(schema).map(([key, field]) => {
        const value = values[key] ?? field.default ?? '';

        if (field.type === 'number') {
          return (
            <Box key={key} sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">
                {field.label}: {typeof value === 'number' ? value : 0}
              </Typography>
              <Slider
                value={typeof value === 'number' ? value : (field.default as number) ?? 0}
                onChange={(_, v) => onChange(key, v as number)}
                min={field.min ?? 0}
                max={field.max ?? 1}
                step={field.step ?? 0.1}
                size="small"
              />
              {field.description && (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                  {field.description}
                </Typography>
              )}
            </Box>
          );
        }

        if (field.type === 'integer') {
          return (
            <TextField
              key={key}
              label={field.label}
              type="number"
              value={value}
              onChange={(e) => onChange(key, parseInt(e.target.value, 10) || 0)}
              size="small"
              helperText={field.description}
              sx={{ minWidth: 140 }}
              slotProps={{ htmlInput: { min: field.min, max: field.max } }}
            />
          );
        }

        if (field.type === 'select' && field.options) {
          return (
            <FormControl key={key} sx={{ minWidth: 150 }}>
              <InputLabel>{field.label}</InputLabel>
              <Select
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                label={field.label}
                size="small"
              >
                {field.options.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        if (field.type === 'boolean') {
          return (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{field.label}</Typography>
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(key, e.target.checked)}
              />
            </Box>
          );
        }

        // string fallback
        return (
          <TextField
            key={key}
            label={field.label}
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
            size="small"
            helperText={field.description}
            sx={{ minWidth: 200 }}
          />
        );
      })}
    </Box>
  );
}

const HISTORY_PAGE_SIZE = 8;

function useHistory(type: string) {
  const [history, setHistory] = useState<PlaygroundExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const filter: Record<string, unknown> = { type };
      if (search.trim()) {
        filter.q = search.trim();
      }
      const start = (page - 1) * HISTORY_PAGE_SIZE;
      const end = start + HISTORY_PAGE_SIZE - 1;
      const filterStr = encodeURIComponent(JSON.stringify(filter));
      const sort = encodeURIComponent(JSON.stringify(['createdAt', 'DESC']));
      const range = encodeURIComponent(JSON.stringify([start, end]));
      const res = await fetch(
        `/api/ai-playground-executions?filter=${filterStr}&sort=${sort}&range=${range}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        // Parse total from Content-Range header
        const contentRange = res.headers.get('Content-Range');
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) setTotal(parseInt(match[1], 10));
        } else {
          setTotal(data.length);
        }
      }
    } catch {
      // ignore
    }
  }, [type, page, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset to page 1 when search changes
  const setSearchAndReset = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

  return { history, total, page, setPage, totalPages, search, setSearch: setSearchAndReset, open, setOpen, refresh };
}

// ─── Provider Status Banner ─────────────────────────────────

function ProviderStatusBanner({
  hasConnectedProvider,
  loading,
}: {
  hasConnectedProvider: boolean;
  loading: boolean;
}) {
  if (loading) return null;

  if (hasConnectedProvider) {
    return (
      <Chip
        icon={<CheckCircleOutlineIcon />}
        label="Connected"
        color="success"
        size="small"
        variant="outlined"
        sx={{ mb: 2 }}
      />
    );
  }

  return (
    <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
      No API keys configured. Go to AI Providers to add keys.
    </Alert>
  );
}

// ─── Usage Info Display ─────────────────────────────────────

function UsageDisplay({ usage }: { usage: UsageInfo | null }) {
  if (!usage) return null;

  const { tokens, costCents, latencyMs, model, provider } = usage;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        mt: 1,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
      }}
    >
      {tokens && (
        <Chip
          size="small"
          variant="outlined"
          label={`Tokens: ${tokens.input ?? 0} in / ${tokens.output ?? 0} out / ${tokens.total ?? 0} total`}
        />
      )}
      {costCents !== undefined && (
        <Chip size="small" variant="outlined" label={`Cost: ${costCents.toFixed(4)} cents`} />
      )}
      {latencyMs !== undefined && (
        <Chip size="small" variant="outlined" label={`Latency: ${latencyMs}ms`} />
      )}
      {model && <Chip size="small" variant="outlined" label={`Model: ${model}`} />}
      {provider && <Chip size="small" variant="outlined" label={`Provider: ${provider}`} />}
    </Box>
  );
}

// ─── Alias Select Component ─────────────────────────────────

function AliasSelect({
  aliases,
  value,
  onChange,
  label,
  loading,
}: {
  aliases: AiAlias[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton variant="rounded" width={200} height={40} />;
  }

  return (
    <FormControl sx={{ minWidth: 200 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
        size="small"
      >
        {aliases.length === 0 ? (
          <MenuItem value="" disabled>
            No aliases configured
          </MenuItem>
        ) : (
          aliases.map((a) => (
            <MenuItem key={a.id} value={a.alias}>
              <Box>
                <Typography variant="body2">{a.alias}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {a.modelId}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
}

// ─── History Sidebar Component ───────────────────────────────

function HistorySidebar({
  history,
  open,
  onToggle,
  onSelect,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
}: {
  history: PlaygroundExecution[];
  open: boolean;
  onToggle: () => void;
  onSelect: (item: PlaygroundExecution) => void;
  search: string;
  onSearchChange: (q: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Box sx={{ width: 300, flexShrink: 0, ml: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <HistoryIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          History
        </Typography>
        <IconButton size="small" onClick={onToggle}>
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <TextField
          placeholder="Search history..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => onSearchChange('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Paper variant="outlined" sx={{ maxHeight: 480, overflowY: 'auto' }}>
          {history.length === 0 ? (
            <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
              {search ? 'No results found' : 'No history yet'}
            </Typography>
          ) : (
            <List disablePadding>
              {history.map((item) => (
                <ListItemButton
                  key={item.id}
                  onClick={() => onSelect(item)}
                  sx={{ py: 1, px: 1.5 }}
                >
                  {item.type === 'image' && (item.output as any)?.url && (
                    <Box
                      component="img"
                      src={(item.output as any).url}
                      alt=""
                      sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: 'cover', mr: 1, flexShrink: 0 }}
                    />
                  )}
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {item.model ?? 'default'}
                        </Typography>
                        <Chip
                          label={item.status}
                          size="small"
                          color={item.status === 'completed' ? 'success' : 'error'}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                          }}
                        >
                          {truncateInput(item.input)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.createdAt).toLocaleString()}
                          {item.latencyMs ? ` (${item.latencyMs}ms)` : ''}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, gap: 1 }}>
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => onPageChange(p)}
              size="small"
              siblingCount={0}
            />
          )}
          {history.length > 0 && (
            <Typography variant="caption" color="text.disabled">
              {history.length} items{totalPages > 1 ? ` (page ${page}/${totalPages})` : ''}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function truncateInput(input: Record<string, unknown>): string {
  const text =
    (input.prompt as string) ??
    (input.text as string) ??
    JSON.stringify(input);
  return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

// ─── Tab Panel ───────────────────────────────────────────────

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

// ─── Text Generation Tab ─────────────────────────────────────

function TextGenerationTab({
  textAliases,
  aliasLoading,
}: {
  textAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [system, setSystem] = useState('');
  const [model, setModel] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('text');
  const { params, setParam, schema } = useDynamicParams(textAliases, model);

  // Set default model when aliases load
  useEffect(() => {
    if (!model && textAliases.length > 0) {
      setModel(textAliases[0].alias);
    }
  }, [textAliases, model]);

  const handleGenerate = async () => {
    setLoading(true);
    setResponse('');
    setError('');
    setUsage(null);
    const start = Date.now();
    const requestBody = { prompt, system, model: model || undefined, ...params };
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setResponse(data.text ?? JSON.stringify(data, null, 2));
        setUsage({
          tokens: data.tokens,
          costCents: data.costCents,
          latencyMs: data.latencyMs ?? latencyMs,
          model: data.model,
          provider: data.provider,
        });
      }

      await saveExecution({
        type: 'text',
        model,
        input: requestBody,
        output: data,
        status: res.ok && !data.error ? 'completed' : 'failed',
        latencyMs,
      });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(friendlyError(errorMsg));
      await saveExecution({
        type: 'text',
        model,
        input: requestBody,
        output: null,
        status: 'failed',
        latencyMs,
      });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.prompt) setPrompt(input.prompt as string);
    if (input.system) setSystem(input.system as string);
    if (input.model) setModel(input.model as string);
    // Restore output and clear error
    setError('');
    if (output?.text) setResponse(output.text as string);
    else setResponse('');
    if (output?.tokens || output?.costCents) {
      setUsage({
        tokens: output.tokens as any,
        costCents: output.costCents as number,
        latencyMs: item.latencyMs ?? 0,
        model: output.model as string,
        provider: output.provider as string,
      });
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <AliasSelect
            aliases={textAliases}
            value={model}
            onChange={setModel}
            label="Model"
            loading={aliasLoading}
          />
          <DynamicParameterForm schema={schema} values={params} onChange={setParam} />
        </Box>
        <TextField
          label="System Prompt"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          multiline
          rows={2}
          fullWidth
        />
        <TextField
          label="User Message"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={4}
          fullWidth
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !prompt}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        {response && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>
              Response
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {response}
            </Typography>
            <UsageDisplay usage={usage} />
          </Paper>
        )}
      </Box>
      <HistorySidebar
        history={history}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onSelect={handleHistorySelect}
        search={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </Box>
  );
}

// ─── Embeddings Tab ──────────────────────────────────────────

function EmbeddingsTab({
  embeddingAliases,
  aliasLoading,
}: {
  embeddingAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [text, setText] = useState('');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<number[] | null>(null);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('embedding');
  const { params, setParam, schema } = useDynamicParams(embeddingAliases, model);

  useEffect(() => {
    if (!model && embeddingAliases.length > 0) {
      setModel(embeddingAliases[0].alias);
    }
  }, [embeddingAliases, model]);

  const handleEmbed = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    setUsage(null);
    const start = Date.now();
    const requestBody = { text, model: model || undefined, ...params };
    try {
      const res = await fetch('/api/ai/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        const embedding = Array.isArray(data.embedding?.[0])
          ? data.embedding[0]
          : (data.embedding ?? []);
        setResult(embedding);
        setUsage({
          tokens: { total: data.tokens },
          latencyMs,
          model: data.model,
        });
      }

      await saveExecution({
        type: 'embedding',
        model,
        input: requestBody,
        output: data,
        status: res.ok && !data.error ? 'completed' : 'failed',
        latencyMs,
      });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({
        type: 'embedding',
        model,
        input: requestBody,
        output: null,
        status: 'failed',
        latencyMs,
      });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.text) setText(input.text as string);
    if (input.model) setModel(input.model as string);
    // Restore embedding result
    if (output?.embedding) setResult(output.embedding as number[]);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <AliasSelect
          aliases={embeddingAliases}
          value={model}
          onChange={setModel}
          label="Embedding Model"
          loading={aliasLoading}
        />
        <DynamicParameterForm schema={schema} values={params} onChange={setParam} />
        <TextField
          label="Input Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          rows={4}
          fullWidth
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleEmbed} disabled={loading || !text}>
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Embedding...' : 'Embed'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        {result && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Embedding Result ({result.length} dimensions)
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}
            >
              [{result.slice(0, 10).map((v) => v.toFixed(4)).join(', ')}
              {result.length > 10 ? ', ...' : ''}]
            </Typography>
            <UsageDisplay usage={usage} />
          </Paper>
        )}
      </Box>
      <HistorySidebar
        history={history}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onSelect={handleHistorySelect}
        search={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </Box>
  );
}

// ─── Image Generation Tab ────────────────────────────────────

function ImageGenerationTab({
  imageAliases,
  aliasLoading,
}: {
  imageAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedFileId, setSavedFileId] = useState<number | null>(null);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('image');
  const { params, setParam, schema } = useDynamicParams(imageAliases, model);
  const { uploadFromUrl, uploading: savingToFiles } = useFileUpload({
    folder: 'ai-images',
    sourceModule: 'ai',
    onComplete: (file) => setSavedFileId(file.id),
  });

  // Set default model when aliases load
  useEffect(() => {
    if (!model && imageAliases.length > 0) {
      setModel(imageAliases[0].alias);
    }
  }, [imageAliases, model]);

  const handleGenerate = async () => {
    setLoading(true);
    setImageUrl('');
    setError('');
    setSavedFileId(null);
    const start = Date.now();
    const requestBody = { prompt, model: model || undefined, ...params };
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setImageUrl(data.url ?? '');
      }

      await saveExecution({
        type: 'image',
        model,
        input: requestBody,
        output: data,
        status: res.ok && !data.error ? 'completed' : 'failed',
        latencyMs,
      });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({
        type: 'image',
        model,
        input: requestBody,
        output: null,
        status: 'failed',
        latencyMs,
      });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.prompt) setPrompt(input.prompt as string);
    if (input.model) setModel(input.model as string);
    // Restore generated image and clear error
    setError('');
    if (output?.url) setImageUrl(output.url as string);
    else setImageUrl('');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <AliasSelect
            aliases={imageAliases}
            value={model}
            onChange={setModel}
            label="Model"
            loading={aliasLoading}
          />
          <DynamicParameterForm schema={schema} values={params} onChange={setParam} />
        </Box>
        <TextField
          label="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !prompt}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        {imageUrl && (
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Box
              component="img"
              src={imageUrl}
              alt="Generated"
              sx={{ maxWidth: '100%', maxHeight: 512, borderRadius: 1 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1.5 }}>
              {savedFileId ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => { window.location.hash = `#/files/${savedFileId}/show`; }}
                >
                  Open in Files
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  disabled={savingToFiles}
                  onClick={() => {
                    const ext = imageUrl.startsWith('data:') ? 'png' : 'png';
                    uploadFromUrl(imageUrl, `generated-${Date.now()}.${ext}`, 'image/png');
                  }}
                >
                  {savingToFiles ? 'Saving...' : 'Save to Files'}
                </Button>
              )}
            </Box>
          </Paper>
        )}
      </Box>
      <HistorySidebar
        history={history}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onSelect={handleHistorySelect}
        search={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </Box>
  );
}

// ─── Structured Output Tab ───────────────────────────────────

function StructuredOutputTab({
  textAliases,
  aliasLoading,
}: {
  textAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [schema, setSchema] = useState(
    JSON.stringify(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'email'],
      },
      null,
      2
    )
  );
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('structured-output');
  const { params, setParam, schema: paramSchema } = useDynamicParams(textAliases, model);

  useEffect(() => {
    if (!model && textAliases.length > 0) {
      setModel(textAliases[0].alias);
    }
  }, [textAliases, model]);

  const handleGenerate = async () => {
    setLoading(true);
    setResult('');
    setError('');
    setUsage(null);
    const start = Date.now();

    let parsedSchema: unknown;
    try {
      parsedSchema = JSON.parse(schema);
    } catch {
      setError('Invalid JSON schema');
      setLoading(false);
      return;
    }

    const requestBody = { schema: parsedSchema, prompt, model: model || undefined, ...params };
    try {
      const res = await fetch('/api/ai/generate-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setResult(JSON.stringify(data.object ?? data, null, 2));
        setUsage({
          tokens: data.tokens,
          costCents: data.costCents,
          latencyMs: data.latencyMs ?? latencyMs,
          model: data.model,
          provider: data.provider,
        });
      }

      await saveExecution({
        type: 'structured-output',
        model: model || 'default',
        input: requestBody as Record<string, unknown>,
        output: data,
        status: res.ok && !data.error ? 'completed' : 'failed',
        latencyMs,
      });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({
        type: 'structured-output',
        model: model || 'default',
        input: { schema, prompt },
        output: null,
        status: 'failed',
        latencyMs,
      });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.schema) setSchema(JSON.stringify(input.schema, null, 2));
    if (input.prompt) setPrompt(input.prompt as string);
    if (input.model) setModel(input.model as string);
    // Restore generated object
    if (output?.object) setResult(JSON.stringify(output.object, null, 2));
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <AliasSelect
            aliases={textAliases}
            value={model}
            onChange={setModel}
            label="Model"
            loading={aliasLoading}
          />
          <DynamicParameterForm schema={paramSchema} values={params} onChange={setParam} />
        </Box>
        <TextField
          label="JSON Schema"
          value={schema}
          onChange={(e) => setSchema(e.target.value)}
          multiline
          rows={8}
          fullWidth
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
        />
        <TextField
          label="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !prompt}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}
        {result && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Generated Object
            </Typography>
            <Box
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                m: 0,
              }}
            >
              {result}
            </Box>
            <UsageDisplay usage={usage} />
          </Paper>
        )}
      </Box>
      <HistorySidebar
        history={history}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onSelect={handleHistorySelect}
        search={search}
        onSearchChange={setSearch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </Box>
  );
}

// ─── Vision (Multimodal) Tab ─────────────────────────────────

function VisionTab({
  textAliases,
  aliasLoading,
}: {
  textAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [model, setModel] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('vision');
  const { params, setParam, schema } = useDynamicParams(textAliases, model);

  useEffect(() => {
    if (!model && textAliases.length > 0) setModel(textAliases[0].alias);
  }, [textAliases, model]);

  const handleGenerate = async () => {
    setLoading(true);
    setResponse('');
    setError('');
    setUsage(null);
    const start = Date.now();

    const messages = [
      {
        role: 'user',
        content: [
          ...(imageUrl ? [{ type: 'image', image: imageUrl }] : []),
          { type: 'text', text: prompt },
        ],
      },
    ];
    const requestBody = { messages, model: model || undefined, ...params };

    try {
      const res = await fetch('/api/ai/generate-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setResponse(data.text ?? JSON.stringify(data, null, 2));
        setUsage({ tokens: data.tokens, costCents: data.costCents, latencyMs: data.latencyMs ?? latencyMs, model: data.model, provider: data.provider });
      }

      await saveExecution({ type: 'vision', model, input: requestBody, output: data, status: res.ok && !data.error ? 'completed' : 'failed', latencyMs });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({ type: 'vision', model, input: requestBody, output: null, status: 'failed', latencyMs });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.model) setModel(input.model as string);
    setError('');
    if (output?.text) setResponse(output.text as string);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <AliasSelect aliases={textAliases} value={model} onChange={setModel} label="Model (Vision)" loading={aliasLoading} />
          <DynamicParameterForm schema={schema} values={params} onChange={setParam} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <FilePickerCombobox
            value={imageUrl}
            onChange={setImageUrl}
            folder="ai-images"
            accept="image/*"
            label="Image"
            placeholder="Search images, paste URL, or browse..."
            helperText="Select from file library, paste a URL, or drag and drop an image below"
          />
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={() => setFilePickerOpen(true)}
            sx={{ mt: 0.5, textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Browse
          </Button>
        </Box>
        <FileUploader
          compact
          folder="ai-images"
          sourceModule="ai"
          accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
          maxFiles={1}
          onUploadComplete={(file) => setImageUrl(file.publicUrl)}
        />
        <FilePicker
          open={filePickerOpen}
          onClose={() => setFilePickerOpen(false)}
          onSelect={(file) => {
            setImageUrl(file.publicUrl);
            setFilePickerOpen(false);
          }}
          folder="ai-images"
          accept="image/*"
          title="Select Image from Library"
        />
        {imageUrl && (
          <Box component="img" src={imageUrl} alt="Preview" sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: 1, objectFit: 'contain' }} />
        )}
        <TextField label="Prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} multiline rows={3} fullWidth />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleGenerate} disabled={loading || !prompt}>
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Analyzing...' : 'Generate'}
          </Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {response && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>Response</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{response}</Typography>
            <UsageDisplay usage={usage} />
          </Paper>
        )}
      </Box>
      <HistorySidebar history={history} open={open} onToggle={() => setOpen((o) => !o)} onSelect={handleHistorySelect} search={search} onSearchChange={setSearch} page={page} totalPages={totalPages} onPageChange={setPage} />
    </Box>
  );
}

// ─── Audio Tab ───────────────────────────────────────────────

function AudioTab({
  audioAliases,
  aliasLoading,
}: {
  audioAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const [subTab, setSubTab] = useState(0);

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Speech-to-Text" />
        <Tab label="Text-to-Speech" />
      </Tabs>
      {subTab === 0 && <SpeechToTextPanel audioAliases={audioAliases} aliasLoading={aliasLoading} />}
      {subTab === 1 && <TextToSpeechPanel audioAliases={audioAliases} aliasLoading={aliasLoading} />}
    </Box>
  );
}

function SpeechToTextPanel({
  audioAliases,
  aliasLoading,
}: {
  audioAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const sttAliases = useMemo(() => audioAliases.filter(a => a.modelId.includes('whisper') || a.modelId.includes('transcribe')), [audioAliases]);
  const [audioUrl, setAudioUrl] = useState('');
  const [model, setModel] = useState('');
  const [language, setLanguage] = useState('');
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('stt');

  useEffect(() => {
    if (!model && sttAliases.length > 0) setModel(sttAliases[0].alias);
  }, [sttAliases, model]);

  const handleTranscribe = async () => {
    setLoading(true);
    setResult('');
    setError('');
    const start = Date.now();
    const requestBody = { audio: audioUrl, model: model || 'whisper', language: language || undefined };

    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setResult(data.text ?? JSON.stringify(data, null, 2));
      }

      await saveExecution({ type: 'stt', model, input: requestBody, output: data, status: res.ok && !data.error ? 'completed' : 'failed', latencyMs });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({ type: 'stt', model, input: requestBody, output: null, status: 'failed', latencyMs });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.audio) setAudioUrl(input.audio as string);
    if (input.model) setModel(input.model as string);
    setError('');
    if (output?.text) setResult(output.text as string);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sttAliases.length > 0 && (
          <AliasSelect aliases={sttAliases} value={model} onChange={setModel} label="STT Model" loading={aliasLoading} />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <FilePickerCombobox
            value={audioUrl}
            onChange={setAudioUrl}
            folder="ai-audio"
            accept="audio/*"
            label="Audio File"
            placeholder="Search audio files, paste URL, or browse..."
            helperText="Select from file library, paste a URL, or drag and drop audio below"
          />
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={() => setAudioPickerOpen(true)}
            sx={{ mt: 0.5, textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Browse
          </Button>
        </Box>
        <FileUploader
          compact
          folder="ai-audio"
          sourceModule="ai"
          accept={{ 'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.webm', '.ogg'] }}
          maxFiles={1}
          onUploadComplete={(file) => setAudioUrl(file.publicUrl)}
        />
        <FilePicker
          open={audioPickerOpen}
          onClose={() => setAudioPickerOpen(false)}
          onSelect={(file) => {
            setAudioUrl(file.publicUrl);
            setAudioPickerOpen(false);
          }}
          folder="ai-audio"
          accept="audio/*"
          title="Select Audio from Library"
        />
        <TextField label="Language (optional)" value={language} onChange={(e) => setLanguage(e.target.value)} size="small" helperText="ISO-639-1 code (e.g., en, es). Auto-detected if empty." sx={{ maxWidth: 200 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleTranscribe} disabled={loading || !audioUrl}>
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Transcribing...' : 'Transcribe'}
          </Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle2" gutterBottom>Transcription</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{result}</Typography>
          </Paper>
        )}
      </Box>
      <HistorySidebar history={history} open={open} onToggle={() => setOpen((o) => !o)} onSelect={handleHistorySelect} search={search} onSearchChange={setSearch} page={page} totalPages={totalPages} onPageChange={setPage} />
    </Box>
  );
}

function TextToSpeechPanel({
  audioAliases,
  aliasLoading,
}: {
  audioAliases: AiAlias[];
  aliasLoading: boolean;
}) {
  const ttsAliases = useMemo(() => audioAliases.filter(a => a.modelId.includes('tts')), [audioAliases]);
  const [text, setText] = useState('');
  const [model, setModel] = useState('');
  const [audioResultUrl, setAudioResultUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { history, open, setOpen, refresh, search, setSearch, page, totalPages, setPage } = useHistory('tts');
  const { params, setParam, schema } = useDynamicParams(ttsAliases, model);

  useEffect(() => {
    if (!model && ttsAliases.length > 0) setModel(ttsAliases[0].alias);
  }, [ttsAliases, model]);

  const handleSpeak = async () => {
    setLoading(true);
    setAudioResultUrl('');
    setError('');
    const start = Date.now();
    const requestBody = { text, model: model || 'tts', ...params };

    try {
      const res = await fetch('/api/ai/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;

      if (!res.ok || data.error) {
        setError(friendlyError(data.error ?? `Request failed (${res.status})`));
      } else {
        setAudioResultUrl(data.audioUrl ?? '');
      }

      await saveExecution({ type: 'tts', model, input: requestBody, output: data, status: res.ok && !data.error ? 'completed' : 'failed', latencyMs });
      refresh();
    } catch (err) {
      const latencyMs = Date.now() - start;
      setError(friendlyError(err instanceof Error ? err.message : 'Unknown error'));
      await saveExecution({ type: 'tts', model, input: requestBody, output: null, status: 'failed', latencyMs });
      refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (item: PlaygroundExecution) => {
    const input = item.input;
    const output = item.output as Record<string, unknown> | null;
    if (input.text) setText(input.text as string);
    if (input.model) setModel(input.model as string);
    setError('');
    if (output?.audioUrl) setAudioResultUrl(output.audioUrl as string);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {ttsAliases.length > 0 && (
            <AliasSelect aliases={ttsAliases} value={model} onChange={setModel} label="TTS Model" loading={aliasLoading} />
          )}
          <DynamicParameterForm schema={schema} values={params} onChange={setParam} />
        </Box>
        <TextField label="Text to speak" value={text} onChange={(e) => setText(e.target.value)} multiline rows={4} fullWidth />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSpeak} disabled={loading || !text}>
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Generating...' : 'Generate Speech'}
          </Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {audioResultUrl && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Generated Audio</Typography>
            <Box component="audio" controls src={audioResultUrl} sx={{ width: '100%' }} />
          </Paper>
        )}
      </Box>
      <HistorySidebar history={history} open={open} onToggle={() => setOpen((o) => !o)} onSelect={handleHistorySelect} search={search} onSearchChange={setSearch} page={page} totalPages={totalPages} onPageChange={setPage} />
    </Box>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function AIPlayground() {
  const [tab, setTab] = useSessionState('activeTab', 0);
  const { textAliases, embeddingAliases, imageAliases, audioAliases, hasConnectedProvider, loading } =
    useAliasesAndProviders();

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        AI Playground
      </Typography>
      <ProviderStatusBanner
        hasConnectedProvider={hasConnectedProvider}
        loading={loading}
      />
      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label="Text Generation" />
          <Tab label="Vision" />
          <Tab label="Embeddings" />
          <Tab label="Image Generation" />
          <Tab label="Audio" />
          <Tab label="Structured Output" />
        </Tabs>
        <TabPanel value={tab} index={0}>
          <TextGenerationTab textAliases={textAliases} aliasLoading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <VisionTab textAliases={textAliases} aliasLoading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <EmbeddingsTab embeddingAliases={embeddingAliases} aliasLoading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <ImageGenerationTab imageAliases={imageAliases} aliasLoading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={4}>
          <AudioTab audioAliases={audioAliases} aliasLoading={loading} />
        </TabPanel>
        <TabPanel value={tab} index={5}>
          <StructuredOutputTab textAliases={textAliases} aliasLoading={loading} />
        </TabPanel>
      </Paper>
    </Box>
  );
}
