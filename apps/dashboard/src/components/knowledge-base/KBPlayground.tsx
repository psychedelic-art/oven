'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Alert,
  Tab,
  Tabs,
  Divider,
  Autocomplete,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';

// ─── Types ──────────────────────────────────────────────────

interface Tenant {
  id: number;
  name: string;
  slug: string;
}

interface KBCategory {
  id: number;
  name: string;
  slug: string;
  entryCount: number;
  enabled: boolean;
}

interface SearchResult {
  id: number;
  question: string;
  answer: string;
  category: string;
  categorySlug: string;
  score: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
  language: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  confidenceThreshold: number;
  topResultConfident: boolean;
}

interface SearchHistoryEntry {
  id: number;
  query: string;
  resultCount: number;
  topScore: number;
  confident: boolean;
  timestamp: Date;
  tenantSlug: string;
  response: SearchResponse;
}

interface KBEntry {
  id: number;
  question: string;
  answer: string;
  categoryId: number;
  keywords: string[] | null;
  priority: number;
  language: string;
  enabled: boolean;
  version: number;
  metadata: Record<string, unknown> | null;
}

interface StatsResponse {
  totalEntries: number;
  enabledEntries: number;
  disabledEntries: number;
  embeddingCoverage: Record<string, number>;
  categoryBreakdown: Array<{ categoryId: number; name: string; entryCount: number }>;
  languageDistribution: Array<{ language: string; count: number }>;
}

// ─── Score Bar ──────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'success' : score >= 0.5 ? 'warning' : 'error';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        color={color}
        sx={{ flex: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right', fontFamily: 'monospace' }}>
        {score.toFixed(2)}
      </Typography>
    </Box>
  );
}

// ─── Embedding Badge (inline) ───────────────────────────────

function EmbedBadge({ status }: { status: string }) {
  if (status === 'embedded') return <Chip label="Embedded" size="small" color="success" variant="outlined" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} />;
  if (status === 'pending' || status === 'processing') return <Chip label={status} size="small" color="warning" variant="outlined" icon={<HourglassEmptyIcon sx={{ fontSize: 14 }} />} />;
  if (status === 'failed') return <Chip label="Failed" size="small" color="error" variant="outlined" icon={<ErrorIcon sx={{ fontSize: 14 }} />} />;
  return <Chip label="None" size="small" variant="outlined" />;
}

// ─── KB Type ───────────────────────────────────────────────

interface KnowledgeBase {
  id: number;
  tenantId: number;
  name: string;
  slug: string;
  description: string | null;
  entryCount: number;
}

// ─── Left Sidebar ───────────────────────────────────────────

function KBSidebar({
  tenants,
  selectedTenant,
  onTenantChange,
  knowledgeBases,
  selectedKB,
  onKBChange,
  categories,
  stats,
  loading,
}: {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  onTenantChange: (t: Tenant | null) => void;
  knowledgeBases: KnowledgeBase[];
  selectedKB: KnowledgeBase | null;
  onKBChange: (kb: KnowledgeBase | null) => void;
  categories: KBCategory[];
  stats: StatsResponse | null;
  loading: boolean;
}) {
  return (
    <Box sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', p: 2, overflow: 'auto' }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
        Knowledge Base
      </Typography>

      <Autocomplete
        options={tenants}
        getOptionLabel={(t) => `${t.name} (${t.slug})`}
        value={selectedTenant}
        onChange={(_, v) => onTenantChange(v)}
        renderInput={(params) => <TextField {...params} label="Tenant" size="small" sx={{ mt: 1 }} />}
        size="small"
        fullWidth
      />

      {selectedTenant && (
        <Autocomplete
          options={knowledgeBases}
          getOptionLabel={(kb) => kb.name}
          value={selectedKB}
          onChange={(_, v) => onKBChange(v)}
          renderInput={(params) => <TextField {...params} label="Knowledge Base" size="small" sx={{ mt: 1 }} />}
          size="small"
          fullWidth
          renderOption={(props, kb) => (
            <li {...props} key={kb.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Typography variant="body2">{kb.name}</Typography>
                <Chip label={`${kb.entryCount}`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              </Box>
            </li>
          )}
        />
      )}

      {loading && <LinearProgress sx={{ mt: 1 }} />}

      {selectedKB && categories.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Categories ({categories.length})
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {categories.map((cat) => (
              <Box key={cat.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {cat.name}
                </Typography>
                <Chip label={cat.entryCount} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {stats && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Quick Stats
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>Entries</Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>{stats.totalEntries}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>Embedded</Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, color: 'success.main' }}>
                {stats.embeddingCoverage.embedded ?? 0}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>Coverage</Typography>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                {stats.embeddingCoverage.percentage ?? 0}%
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Search History Sidebar ─────────────────────────────────

function HistorySidebar({
  history,
  onReplay,
  onClear,
}: {
  history: SearchHistoryEntry[];
  onReplay: (entry: SearchHistoryEntry) => void;
  onClear: () => void;
}) {
  return (
    <Box sx={{ width: 280, flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider', p: 2, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
            Search History
          </Typography>
        </Box>
        {history.length > 0 && (
          <Tooltip title="Clear history">
            <IconButton size="small" onClick={onClear}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {history.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ mt: 2, textAlign: 'center' }}>
          No searches yet
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {history.map((entry) => (
            <Paper
              key={entry.id}
              variant="outlined"
              sx={{ p: 1, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              onClick={() => onReplay(entry)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
                  {entry.query.length > 30 ? entry.query.substring(0, 30) + '...' : entry.query}
                </Typography>
                <ReplayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                <Chip
                  label={`${entry.resultCount} results`}
                  size="small"
                  sx={{ height: 18, fontSize: 10 }}
                />
                {entry.topScore > 0 && (
                  <Chip
                    label={entry.topScore.toFixed(2)}
                    size="small"
                    color={entry.confident ? 'success' : 'warning'}
                    variant="outlined"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                {entry.timestamp.toLocaleTimeString()} — {entry.tenantSlug}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Search Tab ─────────────────────────────────────────────

function SearchTab({
  tenantSlug,
  knowledgeBaseId,
  onSearchDone,
}: {
  tenantSlug: string;
  knowledgeBaseId: number;
  onSearchDone: (query: string, response: SearchResponse) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { query: query.trim(), knowledgeBaseId };

      const res = await fetch(`/api/knowledge-base/${tenantSlug}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      setResponse(data);
      setSelectedResult(data.results[0] ?? null);
      onSearchDone(query.trim(), data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-end' }}>
        <TextField
          label="Search Query"
          placeholder="e.g. ¿Cuál es el horario de atención?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          multiline
          minRows={2}
          maxRows={4}
          sx={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          sx={{ alignSelf: 'flex-end', mb: 0.5 }}
        >
          Search
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {response && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Results list */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">{response.totalResults} result{response.totalResults !== 1 ? 's' : ''}</Typography>
              {response.topResultConfident
                ? <Chip label="Confident" size="small" color="success" variant="outlined" />
                : <Chip label="Low confidence" size="small" color="warning" variant="outlined" />
              }
            </Box>
            {response.results.map((r) => (
              <Card
                key={r.id}
                variant="outlined"
                sx={{
                  mb: 1,
                  cursor: 'pointer',
                  borderColor: selectedResult?.id === r.id ? 'primary.main' : 'divider',
                  borderWidth: selectedResult?.id === r.id ? 2 : 1,
                  '&:hover': { borderColor: 'primary.light' },
                }}
                onClick={() => setSelectedResult(r)}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                    <Chip label={r.matchType} size="small" color={r.matchType === 'semantic' ? 'primary' : 'default'} variant="outlined" />
                    <Chip label={r.category} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{r.question}</Typography>
                  <ScoreBar score={r.score} />
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Detail panel */}
          {selectedResult && (
            <Paper sx={{ flex: 1, p: 2, maxHeight: 500, overflow: 'auto' }}>
              <Typography variant="subtitle2" color="text.secondary">Entry #{selectedResult.id}</Typography>
              <Typography variant="h6" sx={{ mt: 1, mb: 2 }}>{selectedResult.question}</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{selectedResult.answer}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip label={selectedResult.category} size="small" />
                <Chip label={selectedResult.language} size="small" variant="outlined" />
                <Chip label={`Score: ${selectedResult.score.toFixed(3)}`} size="small" color={selectedResult.score >= 0.8 ? 'success' : 'warning'} />
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Entries Tab ────────────────────────────────────────────

function EntriesTab({ tenantId, knowledgeBaseId, categories }: { tenantId: number; knowledgeBaseId: number; categories: KBCategory[] }) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCategory) {
      setEntries([]);
      return;
    }
    setLoading(true);
    fetch(`/api/kb-entries?filter=${encodeURIComponent(JSON.stringify({ categoryId: selectedCategory, knowledgeBaseId }))}&range=[0,99]&sort=["priority","DESC"]`)
      .then((res) => res.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  return (
    <Box>
      <Autocomplete
        options={categories}
        getOptionLabel={(c) => `${c.name} (${c.entryCount} entries)`}
        value={categories.find((c) => c.id === selectedCategory) ?? null}
        onChange={(_, v) => setSelectedCategory(v?.id ?? null)}
        renderInput={(params) => <TextField {...params} label="Select Category" size="small" />}
        size="small"
        sx={{ mb: 2, maxWidth: 400 }}
      />

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {entries.length === 0 && !loading && selectedCategory && (
        <Alert severity="info">No entries in this category</Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((entry) => {
          const meta = entry.metadata as Record<string, unknown> | null;
          const embStatus = (meta?.embeddingStatus as string) ?? 'none';
          return (
            <Paper key={entry.id} variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{entry.question}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, ml: 1 }}>
                  <EmbedBadge status={embStatus} />
                  <Chip label={`v${entry.version}`} size="small" variant="outlined" />
                  <Chip label={`P${entry.priority}`} size="small" variant="outlined" />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {entry.answer.length > 200 ? entry.answer.substring(0, 200) + '...' : entry.answer}
              </Typography>
              {entry.keywords && (entry.keywords as string[]).length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {(entry.keywords as string[]).map((kw) => (
                    <Chip key={kw} label={kw} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                  ))}
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Stats Tab ──────────────────────────────────────────────

function StatsTab({
  tenantSlug,
  knowledgeBaseId,
  stats,
  onRefreshStats,
}: {
  tenantSlug: string;
  knowledgeBaseId: number;
  stats: StatsResponse | null;
  onRefreshStats: () => void;
}) {
  const [reembedding, setReembedding] = useState(false);
  const [force, setForce] = useState(false);
  const [reembedResult, setReembedResult] = useState<Record<string, number> | null>(null);

  const handleReembed = async () => {
    setReembedding(true);
    setReembedResult(null);
    try {
      const res = await fetch(`/api/knowledge-base/${tenantSlug}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force, knowledgeBaseId }),
      });
      const data = await res.json();
      setReembedResult(data);
      onRefreshStats();
    } catch { /* ignore */ }
    setReembedding(false);
  };

  if (!stats) return <Alert severity="info">Select a tenant to view stats</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {/* Overview cards */}
        <Paper variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.totalEntries}</Typography>
          <Typography variant="caption" color="text.secondary">Total Entries</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>{stats.embeddingCoverage.embedded ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">Embedded</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.embeddingCoverage.percentage ?? 0}%</Typography>
          <Typography variant="caption" color="text.secondary">Coverage</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>{stats.embeddingCoverage.failed ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">Failed</Typography>
        </Paper>
      </Box>

      {/* Category breakdown */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Category Breakdown</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {stats.categoryBreakdown.map((cat) => (
          <Chip key={cat.categoryId} label={`${cat.name}: ${cat.entryCount}`} variant="outlined" />
        ))}
      </Box>

      {/* Language distribution */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Languages</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {stats.languageDistribution.map((lang) => (
          <Chip key={lang.language} label={`${lang.language}: ${lang.count}`} variant="outlined" />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Re-embed */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Re-embed Entries</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControlLabel
          control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} size="small" />}
          label={<Typography variant="body2">Force (include already embedded)</Typography>}
        />
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleReembed} disabled={reembedding} size="small">
          {reembedding ? 'Processing...' : 'Re-embed All'}
        </Button>
      </Box>
      {reembedding && <LinearProgress sx={{ mt: 1 }} />}
      {reembedResult && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Processed {reembedResult.total}: {reembedResult.embedded} embedded, {reembedResult.failed} failed
        </Alert>
      )}
    </Box>
  );
}

// ─── Main Playground ────────────────────────────────────────

export default function KBPlayground() {
  const [tab, setTab] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [historyCounter, setHistoryCounter] = useState(0);

  // Load tenants on mount
  useEffect(() => {
    fetch('/api/tenants?range=[0,99]&sort=["name","ASC"]')
      .then((res) => res.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]));
  }, []);

  // Load KBs when tenant changes
  const handleTenantChange = useCallback(async (tenant: Tenant | null) => {
    setSelectedTenant(tenant);
    setKnowledgeBases([]);
    setSelectedKB(null);
    setCategories([]);
    setStats(null);
    if (!tenant) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/kb-knowledge-bases?filter=${encodeURIComponent(JSON.stringify({ tenantId: tenant.id }))}&range=[0,99]&sort=["name","ASC"]`);
      const data = await res.json();
      setKnowledgeBases(Array.isArray(data) ? data : []);
      // Auto-select first KB if only one
      if (Array.isArray(data) && data.length === 1) {
        handleKBChange(data[0], tenant);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Load categories + stats when KB changes
  const handleKBChange = useCallback(async (kb: KnowledgeBase | null, tenant?: Tenant) => {
    const t = tenant ?? selectedTenant;
    setSelectedKB(kb);
    setCategories([]);
    setStats(null);
    if (!kb || !t) return;

    setLoading(true);
    try {
      const [catRes, statsRes] = await Promise.all([
        fetch(`/api/kb-categories?filter=${encodeURIComponent(JSON.stringify({ knowledgeBaseId: kb.id }))}&range=[0,99]&sort=["order","ASC"]`),
        fetch(`/api/knowledge-base/${t.slug}/stats?knowledgeBaseId=${kb.id}`),
      ]);
      const catData = await catRes.json();
      setCategories(Array.isArray(catData) ? catData : []);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedTenant]);

  const handleSearchDone = (query: string, response: SearchResponse) => {
    setSearchHistory((prev) => [{
      id: historyCounter,
      query,
      resultCount: response.totalResults,
      topScore: response.results[0]?.score ?? 0,
      confident: response.topResultConfident,
      timestamp: new Date(),
      tenantSlug: selectedTenant?.slug ?? '',
      response,
    }, ...prev].slice(0, 50));
    setHistoryCounter((c) => c + 1);
  };

  const handleRefreshStats = () => {
    if (selectedTenant && selectedKB) {
      fetch(`/api/knowledge-base/${selectedTenant.slug}/stats?knowledgeBaseId=${selectedKB.id}`)
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => {});
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 48px)' }}>
      {/* Left Sidebar */}
      <KBSidebar
        tenants={tenants}
        selectedTenant={selectedTenant}
        onTenantChange={handleTenantChange}
        knowledgeBases={knowledgeBases}
        selectedKB={selectedKB}
        onKBChange={(kb) => handleKBChange(kb)}
        categories={categories}
        stats={stats}
        loading={loading}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Knowledge Base Playground
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Search" disabled={!selectedKB} />
            <Tab label="Entries" disabled={!selectedKB} />
            <Tab label="Stats" disabled={!selectedKB} />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>
          {!selectedKB ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {!selectedTenant ? 'Select a tenant from the sidebar to start' : 'Select a knowledge base to start'}
            </Alert>
          ) : (
            <>
              {tab === 0 && selectedTenant && (
                <SearchTab
                  tenantSlug={selectedTenant.slug}
                  knowledgeBaseId={selectedKB.id}
                  onSearchDone={handleSearchDone}
                />
              )}
              {tab === 1 && (
                <EntriesTab tenantId={selectedKB.tenantId} knowledgeBaseId={selectedKB.id} categories={categories} />
              )}
              {tab === 2 && selectedTenant && (
                <StatsTab
                  tenantSlug={selectedTenant.slug}
                  knowledgeBaseId={selectedKB.id}
                  stats={stats}
                  onRefreshStats={handleRefreshStats}
                />
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Right Sidebar — Search History */}
      <HistorySidebar
        history={searchHistory}
        onReplay={() => { setTab(0); }}
        onClear={() => setSearchHistory([])}
      />
    </Box>
  );
}
