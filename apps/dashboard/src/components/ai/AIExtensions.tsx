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
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';

interface Extension {
  name: string;
  description: string;
  status: 'installed' | 'not_installed' | 'error';
  version?: string;
  error?: string;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'error' | 'warning' }> = {
  installed: { label: 'Installed', color: 'success' },
  not_installed: { label: 'Not Installed', color: 'error' },
  error: { label: 'Error', color: 'warning' },
};

export default function AIExtensions() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        const res = await fetch('/api/ai/extensions');
        if (res.ok) {
          const data = await res.json();
          setExtensions(Array.isArray(data) ? data : []);
        } else {
          setExtensions([
            {
              name: 'pgvector',
              description: 'PostgreSQL vector similarity search extension',
              status: 'not_installed',
            },
          ]);
        }
      } catch {
        setExtensions([
          {
            name: 'pgvector',
            description: 'PostgreSQL vector similarity search extension',
            status: 'not_installed',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchExtensions();
  }, []);

  const handleInstall = async (name: string) => {
    setInstalling(name);
    try {
      await fetch('/api/ai/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setExtensions((prev) =>
        prev.map((ext) =>
          ext.name === name ? { ...ext, status: 'installed' as const } : ext
        )
      );
    } catch {
      // placeholder
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Extensions
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Extension</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {extensions.map((ext) => {
              const config = statusConfig[ext.status] ?? statusConfig.error;
              return (
                <TableRow key={ext.name}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{ext.name}</Typography>
                  </TableCell>
                  <TableCell>{ext.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={config.label}
                      size="small"
                      color={config.color}
                    />
                    {ext.error && (
                      <Typography variant="caption" color="error.main" sx={{ ml: 1 }}>
                        {ext.error}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{ext.version ?? '-'}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant={ext.status === 'installed' ? 'outlined' : 'contained'}
                      size="small"
                      disabled={ext.status === 'installed' || installing === ext.name}
                      onClick={() => handleInstall(ext.name)}
                    >
                      {installing === ext.name ? (
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                      ) : null}
                      {ext.status === 'installed'
                        ? 'Reinstall'
                        : ext.status === 'error'
                          ? 'Retry Install'
                          : 'Install'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
