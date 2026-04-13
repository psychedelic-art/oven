'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Title } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';

interface UsageEntry {
  channelType: string;
  used: number;
  limit: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}

interface UsageResponse {
  tenantId: number;
  periodStart: string;
  usage: UsageEntry[];
}

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
};

function UsageGauge({ entry }: { entry: UsageEntry }) {
  const percentage = entry.limit > 0 ? Math.min((entry.used / entry.limit) * 100, 100) : 0;
  const color = percentage >= 90 ? 'error' : percentage >= 80 ? 'warning' : 'primary';

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {channelLabels[entry.channelType] ?? entry.channelType}
        </Typography>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {entry.used} / {entry.limit}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{ height: 8, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {entry.remaining} remaining ({Math.round(percentage)}% used)
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function UsageDashboardPage() {
  const [tenantId, setTenantId] = useState('1');
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/usage?tenantId=${tenantId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const usage = data?.usage ?? [];

  return (
    <Box sx={{ p: 2 }}>
      <Title title="Notification Usage" />

      <Box sx={{ mb: 3, maxWidth: 200 }}>
        <TextField
          label="Tenant ID"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          size="small"
          fullWidth
        />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Usage gauge cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {usage.map((entry) => (
          <UsageGauge key={entry.channelType} entry={entry} />
        ))}
      </Box>

      {/* Detail table */}
      {usage.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Usage Detail
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Channel</TableCell>
                    <TableCell>Used</TableCell>
                    <TableCell>Limit</TableCell>
                    <TableCell>Remaining</TableCell>
                    <TableCell>Usage %</TableCell>
                    <TableCell>Period Start</TableCell>
                    <TableCell>Period End</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.map((entry) => {
                    const pct = entry.limit > 0 ? Math.round((entry.used / entry.limit) * 100) : 0;
                    return (
                      <TableRow key={entry.channelType}>
                        <TableCell>{channelLabels[entry.channelType] ?? entry.channelType}</TableCell>
                        <TableCell>{entry.used}</TableCell>
                        <TableCell>{entry.limit}</TableCell>
                        <TableCell>{entry.remaining}</TableCell>
                        <TableCell>{pct}%</TableCell>
                        <TableCell>{entry.periodStart}</TableCell>
                        <TableCell>{entry.periodEnd}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {!loading && usage.length === 0 && (
        <Typography color="text.secondary">
          No usage data available for this tenant.
        </Typography>
      )}
    </Box>
  );
}
