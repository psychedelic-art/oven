'use client';

import { useState } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

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

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'success' : score >= 0.5 ? 'warning' : 'error';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ flex: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right', fontFamily: 'monospace' }}>
        {score.toFixed(2)}
      </Typography>
    </Box>
  );
}

const matchTypeColors: Record<string, 'primary' | 'secondary' | 'default'> = {
  semantic: 'primary',
  keyword: 'secondary',
  hybrid: 'default',
};

export default function KBSearchTest() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    if (!tenantSlug || !query) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedResult(null);

    try {
      const res = await fetch(`/api/knowledge-base/${tenantSlug}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      setResponse(data);
      if (data.results.length > 0) {
        setSelectedResult(data.results[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Knowledge Base Search Test
      </Typography>

      {/* Search Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            label="Tenant Slug"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            placeholder="clinica-norte"
          />
          <TextField
            label="Search Query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 300 }}
            placeholder="What are the office hours?"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading || !tenantSlug || !query}
          >
            Search
          </Button>
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Results */}
      {response && (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left — Results List */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                {response.totalResults} result{response.totalResults !== 1 ? 's' : ''}
              </Typography>
              {response.topResultConfident ? (
                <Chip label="Confident match" size="small" color="success" />
              ) : (
                <Chip label="Low confidence" size="small" color="warning" />
              )}
            </Box>

            {response.results.length === 0 ? (
              <Alert severity="info">No results found for this query</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {response.results.map((result) => (
                  <Card
                    key={result.id}
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      borderColor: selectedResult?.id === result.id ? 'primary.main' : 'divider',
                      borderWidth: selectedResult?.id === result.id ? 2 : 1,
                      '&:hover': { borderColor: 'primary.light' },
                    }}
                    onClick={() => setSelectedResult(result)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                        <Chip
                          label={result.matchType}
                          size="small"
                          color={matchTypeColors[result.matchType] ?? 'default'}
                          variant="outlined"
                        />
                        <Chip label={result.category} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                        {result.question}
                      </Typography>
                      <ScoreBar score={result.score} />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>

          {/* Right — Selected Result Detail */}
          {selectedResult && (
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Selected Entry (ID: {selectedResult.id})
                </Typography>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedResult.question}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {selectedResult.answer}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={selectedResult.category} size="small" />
                  <Chip label={selectedResult.language} size="small" variant="outlined" />
                  <Chip
                    label={`Score: ${selectedResult.score.toFixed(3)}`}
                    size="small"
                    color={selectedResult.score >= 0.8 ? 'success' : 'warning'}
                  />
                  <Chip label={selectedResult.matchType} size="small" variant="outlined" />
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
