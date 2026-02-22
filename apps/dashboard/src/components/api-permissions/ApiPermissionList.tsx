'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Switch,
  TextField,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface ApiEndpoint {
  module: string;
  route: string;
  method: string;
  id: number | null;
  permissionId: number | null;
  permissionSlug: string | null;
  isPublic: boolean;
}

interface Permission {
  id: number;
  slug: string;
  resource: string;
  action: string;
}

const METHOD_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'default'> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  DELETE: 'error',
  PATCH: 'default',
};

export default function ApiPermissionList() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [epRes, permRes] = await Promise.all([
          fetch('/api/api-endpoints?range=[0,999]'),
          fetch('/api/permissions?range=[0,999]'),
        ]);
        if (epRes.ok) setEndpoints(await epRes.json());
        if (permRes.ok) setPermissions(await permRes.json());
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePermissionChange = useCallback(async (ep: ApiEndpoint, permissionId: number | null) => {
    await fetch('/api/api-endpoint-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: ep.module,
        route: ep.route,
        method: ep.method,
        permissionId,
        isPublic: ep.isPublic,
      }),
    });

    setEndpoints((prev) =>
      prev.map((e) =>
        e.module === ep.module && e.route === ep.route && e.method === ep.method
          ? { ...e, permissionId, permissionSlug: permissions.find((p) => p.id === permissionId)?.slug ?? null }
          : e
      )
    );
  }, [permissions]);

  const handlePublicToggle = useCallback(async (ep: ApiEndpoint, isPublic: boolean) => {
    await fetch('/api/api-endpoint-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: ep.module,
        route: ep.route,
        method: ep.method,
        permissionId: ep.permissionId,
        isPublic,
      }),
    });

    setEndpoints((prev) =>
      prev.map((e) =>
        e.module === ep.module && e.route === ep.route && e.method === ep.method
          ? { ...e, isPublic }
          : e
      )
    );
  }, []);

  const filtered = endpoints.filter(
    (ep) =>
      !filter ||
      ep.route.toLowerCase().includes(filter.toLowerCase()) ||
      ep.module.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by module
  const groupedByModule = filtered.reduce<Record<string, ApiEndpoint[]>>((acc, ep) => {
    (acc[ep.module] ??= []).push(ep);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        API Permissions
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Map API endpoints to permissions. Endpoints are auto-discovered from registered modules.
      </Typography>

      <TextField
        size="small"
        placeholder="Filter endpoints..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mb: 2, width: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {Object.entries(groupedByModule).map(([module, eps]) => (
        <Paper key={module} sx={{ mb: 2 }}>
          <Box sx={{ bgcolor: 'grey.50', px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {module}
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Method</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Permission</TableCell>
                  <TableCell align="center">Public</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eps.map((ep) => (
                  <TableRow key={`${ep.module}-${ep.route}-${ep.method}`}>
                    <TableCell>
                      <Chip
                        label={ep.method}
                        size="small"
                        color={METHOD_COLORS[ep.method] || 'default'}
                        sx={{ fontWeight: 600, minWidth: 60 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        /api/{ep.route}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                          value={ep.permissionId ?? ''}
                          displayEmpty
                          onChange={(e) => handlePermissionChange(ep, e.target.value ? Number(e.target.value) : null)}
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {permissions.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.slug}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={ep.isPublic}
                        size="small"
                        onChange={(e) => handlePublicToggle(ep, e.target.checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}
