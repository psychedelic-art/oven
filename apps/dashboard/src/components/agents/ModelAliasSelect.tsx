'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Typography, Chip } from '@mui/material';

interface AiAlias {
  id: number;
  alias: string;
  modelId: string;
  type: string;
}

interface ModelAliasSelectProps {
  value: string;
  onChange: (alias: string) => void;
}

export default function ModelAliasSelect({ value, onChange }: ModelAliasSelectProps) {
  const [aliases, setAliases] = useState<AiAlias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-aliases?range=[0,99]&sort=["alias","ASC"]')
      .then((res) => res.json())
      .then((data) => setAliases(Array.isArray(data) ? data : []))
      .catch(() => setAliases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TextField
      select
      label="Model Alias"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
      helperText="Select an AI model alias for this agent"
      disabled={loading}
    >
      {aliases.map((alias) => (
        <MenuItem key={alias.id} value={alias.alias}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{alias.alias}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip label={alias.modelId} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
              <Chip label={alias.type} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
            </Box>
          </Box>
        </MenuItem>
      ))}
    </TextField>
  );
}
