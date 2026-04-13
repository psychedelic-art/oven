'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useGetIdentity, useNotify, Title } from 'react-admin';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Divider,
  Tab,
  Tabs,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

interface SessionRow {
  id: number;
  userId: number;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

interface ApiKeyRow {
  id: number;
  name: string;
  keyPrefix: string;
  tenantId: number | null;
  enabled: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: identity, isLoading } = useGetIdentity();
  const notify = useNotify();
  const [tab, setTab] = useState(0);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/auth-sessions?sort=["id","DESC"]&range=[0,49]');
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/api-keys?sort=["id","DESC"]&range=[0,49]');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 2) fetchSessions();
    if (tab === 3) fetchApiKeys();
  }, [tab, fetchSessions, fetchApiKeys]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error?.message ?? data.error ?? 'Failed to change password';
        setPasswordError(msg);
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password changed successfully', { type: 'success' });
    } catch {
      setPasswordError('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/auth-sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        notify('Session revoked', { type: 'success' });
      }
    } catch {
      notify('Failed to revoke session', { type: 'error' });
    }
  };

  const handleRevokeApiKey = async (keyId: number) => {
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
        notify('API key revoked', { type: 'success' });
      }
    } catch {
      notify('Failed to revoke API key', { type: 'error' });
    }
  };

  if (isLoading) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Title title="My Profile" />
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar src={identity?.avatar} sx={{ width: 64, height: 64 }}>
              {identity?.fullName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">{identity?.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {identity?.email}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Details" />
            <Tab label="Change Password" />
            <Tab label="Sessions" />
            <Tab label="API Keys" />
          </Tabs>

          {/* Details Tab */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <TextField
                label="Email"
                value={identity?.email ?? ''}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Full Name"
                value={identity?.fullName ?? ''}
                InputProps={{ readOnly: true }}
                fullWidth
              />
            </Box>
          </TabPanel>

          {/* Change Password Tab */}
          <TabPanel value={tab} index={1}>
            <Box sx={{ maxWidth: 400 }}>
              {passwordError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordError}
                </Alert>
              )}
              <form onSubmit={handleChangePassword}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="current-password"
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="new-password"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={passwordLoading}
                  sx={{ mt: 2 }}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </Box>
          </TabPanel>

          {/* Sessions Tab */}
          <TabPanel value={tab} index={2}>
            {sessionsLoading ? (
              <Typography>Loading sessions...</Typography>
            ) : sessions.length === 0 ? (
              <Typography color="text.secondary">No active sessions found.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>User Agent</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.id}</TableCell>
                        <TableCell>{session.ipAddress ?? 'N/A'}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.userAgent ?? 'N/A'}
                        </TableCell>
                        <TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell>
                        <TableCell>{new Date(session.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* API Keys Tab */}
          <TabPanel value={tab} index={3}>
            {keysLoading ? (
              <Typography>Loading API keys...</Typography>
            ) : apiKeys.length === 0 ? (
              <Typography color="text.secondary">No API keys found.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Key Prefix</TableCell>
                      <TableCell>Enabled</TableCell>
                      <TableCell>Last Used</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>
                          {key.keyPrefix}....
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={key.enabled ? 'Yes' : 'No'}
                            color={key.enabled ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRevokeApiKey(key.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
