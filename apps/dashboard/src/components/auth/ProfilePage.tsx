'use client';
import React from 'react';
import { useGetIdentity, Title } from 'react-admin';
import { Card, CardContent, Typography, Avatar, Box, Divider } from '@mui/material';

export default function ProfilePage() {
  const { data: identity, isLoading } = useGetIdentity();

  if (isLoading) return null;

  return (
    <Box sx={{ p: 2 }}>
      <Title title="My Profile" />
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar src={identity?.avatar} sx={{ width: 64, height: 64 }}>
              {identity?.fullName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">{identity?.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{identity?.email}</Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Profile management and password change will be available here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
