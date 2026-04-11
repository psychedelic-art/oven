import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, Card, CardContent, CardActions, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { builtinTemplates, getTemplatesByCategory } from '../templates/builtinTemplates';
import type { WorkflowTemplate } from '../templates/builtinTemplates';

const difficultyColors: Record<string, 'success' | 'warning' | 'error'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
};

interface TemplatePickerProps {
  onSelect: (template: WorkflowTemplate) => void;
  onCancel: () => void;
}

export function TemplatePicker({ onSelect, onCancel }: TemplatePickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Object.keys(getTemplatesByCategory());
  const filtered = builtinTemplates.filter(t => {
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Start from a Template</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Choose a pattern to get started quickly, or create a blank workflow.
      </Typography>

      {/* Search + Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
          sx={{ minWidth: 200 }}
        />
        <Chip label="All" variant={selectedCategory === null ? 'filled' : 'outlined'} onClick={() => setSelectedCategory(null)} size="small" />
        {categories.map(cat => (
          <Chip key={cat} label={cat} variant={selectedCategory === cat ? 'filled' : 'outlined'}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} size="small" sx={{ textTransform: 'capitalize' }} />
        ))}
      </Box>

      {/* Template Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, mb: 3 }}>
        {filtered.map(template => (
          <Card key={template.slug} variant="outlined" sx={{ '&:hover': { borderColor: 'primary.main', boxShadow: 2 }, transition: 'all 0.15s' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ fontSize: 24 }}>{template.icon}</Typography>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{template.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Chip label={template.category} size="small" sx={{ fontSize: 10, height: 18, textTransform: 'capitalize' }} />
                    <Chip label={template.difficulty} size="small" color={difficultyColors[template.difficulty]} sx={{ fontSize: 10, height: 18 }} />
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, mb: 1 }}>
                {template.description}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {template.nodeCount} nodes
              </Typography>
            </CardContent>
            <CardActions sx={{ pt: 0 }}>
              <Button size="small" variant="contained" onClick={() => onSelect(template)}>
                Use Template
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" onClick={onCancel}>Cancel</Button>
        <Button variant="text" onClick={onCancel}>Start Blank Instead</Button>
      </Box>
    </Box>
  );
}
