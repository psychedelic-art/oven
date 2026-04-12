'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import type { EffectiveLimit } from '../types';

interface UsageMeterProps {
  tenantId: number;
}

interface UsageData {
  tenantId: number;
  planName: string;
  planSlug: string;
  limits: EffectiveLimit[];
}

function limitColor(quota: number, _used: number): 'primary' | 'warning' | 'error' {
  // Since we show quota allocation (not usage vs quota), always primary.
  // When wired to real usage data, the threshold logic would apply here.
  return quota > 0 ? 'primary' : 'error';
}

export default function UsageMeter({ tenantId }: UsageMeterProps) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLimits() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/tenant-subscriptions/${tenantId}/limits`,
          { cache: 'no-store' },
        );
        if (!res.ok) {
          const text = await res.text();
          setError(text || `Error ${res.status}`);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError('Failed to fetch usage limits');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLimits();
    return () => { cancelled = true; };
  }, [tenantId]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width={200} />
        <Skeleton variant="rectangular" height={24} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" height={24} sx={{ mt: 1 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ m: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!data || data.limits.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        No usage limits configured for this tenant.
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Plan: {data.planName}
      </Typography>
      {data.limits.map((limit) => (
        <Box key={limit.service} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{limit.service}</Typography>
            <Typography variant="body2" color="text.secondary">
              0 / {limit.quota} {limit.unit}/{limit.period}
              {limit.source === 'override' ? ' (override)' : ''}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={0}
            color={limitColor(limit.quota, 0)}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      ))}
    </Box>
  );
}
