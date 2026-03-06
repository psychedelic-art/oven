import React from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { NavigationConfig, UiFlowPageDefinition } from '@oven/module-ui-flows/types';

interface NavigationPanelProps {
  navigation: NavigationConfig;
  pages: UiFlowPageDefinition[];
  onChange: (navigation: NavigationConfig) => void;
  onClose: () => void;
}

/**
 * Right-side panel for editing portal navigation structure.
 */
export function NavigationPanel({ navigation, pages, onChange, onClose }: NavigationPanelProps) {
  const updateType = (type: NavigationConfig['type']) => {
    onChange({ ...navigation, type });
  };

  const addItem = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    onChange({
      ...navigation,
      items: [...navigation.items, { pageId, label: page.title || page.slug }],
    });
  };

  const removeItem = (index: number) => {
    onChange({
      ...navigation,
      items: navigation.items.filter((_, i) => i !== index),
    });
  };

  const updateItemLabel = (index: number, label: string) => {
    const items = [...navigation.items];
    items[index] = { ...items[index], label };
    onChange({ ...navigation, items });
  };

  // Pages not yet in navigation
  const availablePages = pages.filter(
    (p) => !navigation.items.some((item) => item.pageId === p.id)
  );

  return (
    <Box
      sx={{
        width: 300,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2">Navigation</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Nav type */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Layout
      </Typography>
      <Select
        size="small"
        value={navigation.type || 'sidebar'}
        onChange={(e: any) => updateType(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      >
        <MenuItem value="sidebar">Sidebar</MenuItem>
        <MenuItem value="topbar">Top Bar</MenuItem>
        <MenuItem value="tabs">Tabs</MenuItem>
      </Select>

      <Divider sx={{ mb: 2 }} />

      {/* Nav items */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Menu Items ({navigation.items.length})
      </Typography>

      <List dense disablePadding>
        {navigation.items.map((item, index) => (
          <ListItem key={index} disableGutters sx={{ pl: 0, pr: 5 }}>
            <ListItemText
              primary={
                <TextField
                  size="small"
                  value={item.label}
                  onChange={(e: any) => updateItemLabel(index, e.target.value)}
                  fullWidth
                  variant="standard"
                  sx={{ '& input': { fontSize: 13 } }}
                />
              }
              secondary={
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                  {pages.find((p) => p.id === item.pageId)?.slug || item.pageId}
                </Typography>
              }
            />
            <ListItemSecondaryAction>
              <IconButton size="small" onClick={() => removeItem(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Add page to nav */}
      {availablePages.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Add page:
          </Typography>
          {availablePages.map((page) => (
            <Box
              key={page.id}
              onClick={() => addItem(page.id)}
              sx={{
                p: 0.75,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: 'grey.50',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': { bgcolor: 'primary.50' },
              }}
            >
              <AddIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>
                {page.title || page.slug}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
