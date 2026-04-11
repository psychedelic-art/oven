'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';

interface SummaryCard {
  label: string;
  value: string;
}

function StatCard({ label, value }: SummaryCard) {
  return (
    <Paper sx={{ p: 2, flex: 1, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function AIUsageDashboard() {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalCostCents: 0,
    avgLatencyMs: 0,
    totalCalls: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/usage/summary?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalTokens: data.totalTokens ?? 0,
            totalCostCents: data.totalCostCents ?? 0,
            avgLatencyMs: data.avgLatencyMs ?? 0,
            totalCalls: data.totalCalls ?? 0,
          });
          setRecentLogs(data.recentLogs ?? []);
        }
      } catch {
        // API not yet implemented
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Usage Dashboard</Typography>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            label="Period"
            size="small"
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <StatCard
              label="Total Tokens"
              value={stats.totalTokens.toLocaleString()}
            />
            <StatCard
              label="Total Cost"
              value={`$${(stats.totalCostCents / 100).toFixed(2)}`}
            />
            <StatCard
              label="Avg Latency"
              value={`${stats.avgLatencyMs}ms`}
            />
            <StatCard
              label="Total Calls"
              value={stats.totalCalls.toLocaleString()}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ flex: 1, minWidth: 300, minHeight: 300, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tokens over Time
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 240,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary">
                  Chart: Tokens over time
                </Typography>
              </Box>
            </Paper>
            <Paper sx={{ flex: 1, minWidth: 300, minHeight: 300, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cost per Provider
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 240,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary">
                  Chart: Cost per provider
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Recent Usage Logs
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell>Tool</TableCell>
                  <TableCell align="right">In Tokens</TableCell>
                  <TableCell align="right">Out Tokens</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Latency</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No usage data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLogs.map((log: any, i: number) => (
                    <TableRow key={log.id ?? i}>
                      <TableCell>{log.modelId}</TableCell>
                      <TableCell>{log.toolName}</TableCell>
                      <TableCell align="right">{log.inputTokens}</TableCell>
                      <TableCell align="right">{log.outputTokens}</TableCell>
                      <TableCell align="right">
                        ${((log.costCents ?? 0) / 100).toFixed(4)}
                      </TableCell>
                      <TableCell align="right">{log.latencyMs}ms</TableCell>
                      <TableCell>{log.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
