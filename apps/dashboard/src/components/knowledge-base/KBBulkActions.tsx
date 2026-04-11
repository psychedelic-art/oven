'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';

interface BulkResult {
  total: number;
  embedded: number;
  failed: number;
  skipped: number;
}

interface StatsResponse {
  totalEntries: number;
  enabledEntries: number;
  disabledEntries: number;
  embeddingCoverage: Record<string, number>;
  categoryBreakdown: Array<{ categoryId: number; name: string; entryCount: number }>;
  languageDistribution: Array<{ language: string; count: number }>;
}

export default function KBBulkActions() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleReembed = async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    setBulkResult(null);

    try {
      const res = await fetch(`/api/knowledge-base/${tenantSlug}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data: BulkResult = await res.json();
      setBulkResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-embed failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStats = async () => {
    if (!tenantSlug) return;
    setStatsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/knowledge-base/${tenantSlug}/stats`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }
      const data: StatsResponse = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Knowledge Base Bulk Actions
      </Typography>

      {/* Tenant selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          label="Tenant Slug"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          size="small"
          sx={{ minWidth: 250 }}
          placeholder="clinica-norte"
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Card 1: Re-embed */}
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardHeader
            title="Re-embed Entries"
            subheader="Regenerate embedding vectors for all entries"
          />
          <CardContent>
            <FormControlLabel
              control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
              label="Force re-embed (include already embedded entries)"
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleReembed}
                disabled={loading || !tenantSlug}
              >
                {loading ? 'Processing...' : 'Re-embed All'}
              </Button>
            </Box>
            {loading && <LinearProgress sx={{ mt: 2 }} />}
            {bulkResult && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Processed {bulkResult.total} entries:
                  {' '}{bulkResult.embedded} embedded,
                  {' '}{bulkResult.failed} failed,
                  {' '}{bulkResult.skipped} skipped
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Stats */}
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardHeader
            title="Knowledge Base Stats"
            subheader="Entry counts, embedding coverage, category breakdown"
          />
          <CardContent>
            <Button
              variant="outlined"
              startIcon={<BarChartIcon />}
              onClick={handleLoadStats}
              disabled={statsLoading || !tenantSlug}
            >
              {statsLoading ? 'Loading...' : 'Load Stats'}
            </Button>
            {statsLoading && <LinearProgress sx={{ mt: 2 }} />}
            {stats && (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Overview */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`${stats.totalEntries} total`} />
                  <Chip label={`${stats.enabledEntries} enabled`} color="success" variant="outlined" />
                  <Chip label={`${stats.disabledEntries} disabled`} color="default" variant="outlined" />
                </Box>

                {/* Embedding coverage */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Embedding Coverage</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(stats.embeddingCoverage)
                      .filter(([key]) => key !== 'percentage')
                      .map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${status}: ${count}`}
                          size="small"
                          variant="outlined"
                          color={status === 'embedded' ? 'success' : status === 'failed' ? 'error' : 'default'}
                        />
                      ))}
                    <Chip
                      label={`${stats.embeddingCoverage.percentage ?? 0}% covered`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </Box>

                {/* Categories */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Categories</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {stats.categoryBreakdown.map((cat) => (
                      <Chip
                        key={cat.categoryId}
                        label={`${cat.name}: ${cat.entryCount}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                {/* Languages */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Languages</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {stats.languageDistribution.map((lang) => (
                      <Chip
                        key={lang.language}
                        label={`${lang.language}: ${lang.count}`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
