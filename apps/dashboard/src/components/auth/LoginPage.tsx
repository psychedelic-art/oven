'use client';
import React, { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import { Card, CardContent, TextField, Button, Typography, Box } from '@mui/material';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password }).catch(() => notify('Invalid credentials', { type: 'error' }));
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5">
      <Card sx={{ minWidth: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>Sign In</Typography>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Sign In</Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
