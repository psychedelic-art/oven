import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import WebIcon from '@mui/icons-material/Web';
import DescriptionIcon from '@mui/icons-material/Description';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CodeIcon from '@mui/icons-material/Code';

const PAGE_TYPES = [
  { type: 'home', label: 'Home (Entry)', color: '#4caf50', Icon: HomeIcon },
  { type: 'landing', label: 'Landing Page', color: '#2196f3', Icon: WebIcon },
  { type: 'form', label: 'Form Page', color: '#ff9800', Icon: DescriptionIcon },
  { type: 'faq', label: 'FAQ Page', color: '#9c27b0', Icon: HelpOutlineIcon },
  { type: 'chat', label: 'Chat / Support', color: '#e91e63', Icon: ChatBubbleOutlineIcon },
  { type: 'custom', label: 'Custom Page', color: '#607d8b', Icon: CodeIcon },
];

/**
 * Left sidebar palette — drag page types onto the canvas.
 */
export function PagePalette() {
  const onDragStart = (event: React.DragEvent, pageType: string) => {
    event.dataTransfer.setData('application/ui-flow-page', pageType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box
      sx={{
        width: 240,
        borderRight: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" gutterBottom>
          Page Types
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Drag a page type onto the canvas
        </Typography>
      </Box>

      <Box sx={{ px: 1.5 }}>
        {PAGE_TYPES.map((item) => (
          <Box
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            sx={{
              p: 1.5,
              mb: 1,
              borderRadius: 1.5,
              bgcolor: item.color + '10',
              border: '1px solid',
              borderColor: item.color + '40',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': { borderColor: item.color, bgcolor: item.color + '18' },
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <item.Icon sx={{ fontSize: 20, color: item.color }} />
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                {item.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 1.5, mt: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Quick Add
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {PAGE_TYPES.slice(0, 4).map((item) => (
            <Chip
              key={item.type}
              label={item.label.split(' ')[0]}
              size="small"
              draggable
              onDragStart={(e: any) => onDragStart(e, item.type)}
              sx={{
                cursor: 'grab',
                bgcolor: item.color + '20',
                borderColor: item.color,
                border: '1px solid',
                '&:active': { cursor: 'grabbing' },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
