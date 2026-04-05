'use client';

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, TextField,
} from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import NumbersIcon from '@mui/icons-material/Numbers';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ListIcon from '@mui/icons-material/List';
import type { VariableData } from '../types';

interface VariableModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (variable: VariableData) => void;
  variables: VariableData[];
}

const typeIcons: Record<string, React.ReactElement> = {
  string: <DataObjectIcon sx={{ fontSize: 16 }} />,
  number: <NumbersIcon sx={{ fontSize: 16 }} />,
  boolean: <ToggleOnIcon sx={{ fontSize: 16 }} />,
  select: <ListIcon sx={{ fontSize: 16 }} />,
};

const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  string: 'primary',
  number: 'secondary',
  boolean: 'success',
  select: 'warning',
};

export default function VariableModal({ open, onClose, onConfirm, variables }: VariableModalProps) {
  const [selected, setSelected] = useState<VariableData | null>(null);
  const [filter, setFilter] = useState('');

  if (!open) return null;

  const filtered = variables.filter((v) =>
    v.name && v.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleConfirm = () => {
    if (selected) {
      onConfirm(selected);
      setSelected(null);
      setFilter('');
    }
  };

  const handleClose = () => {
    setSelected(null);
    setFilter('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Insert Variable</DialogTitle>
      <DialogContent>
        {variables.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No variables defined yet. Add variables in the Input Schema section first.
            </Typography>
          </Box>
        ) : (
          <>
            {variables.length > 5 && (
              <TextField
                placeholder="Filter variables..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                sx={{ mb: 2 }}
              />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Select a variable to insert at cursor position:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filtered.map((variable) => (
                <Box
                  key={variable.name}
                  onClick={() => setSelected(variable)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: selected?.name === variable.name ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selected?.name === variable.name ? 'primary.50' : 'transparent',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                    transition: 'all 0.15s',
                  }}
                >
                  <Chip
                    icon={typeIcons[variable.type]}
                    label={variable.type}
                    size="small"
                    color={typeColors[variable.type] ?? 'primary'}
                    variant="outlined"
                    sx={{ height: 24, fontSize: 11 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {'{{' + variable.name + '}}'}
                    </Typography>
                    {variable.description && (
                      <Typography variant="caption" color="text.secondary">
                        {variable.description}
                      </Typography>
                    )}
                  </Box>
                  {variable.defaultValue && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                      = {variable.defaultValue}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selected}
        >
          Insert Variable
        </Button>
      </DialogActions>
    </Dialog>
  );
}
