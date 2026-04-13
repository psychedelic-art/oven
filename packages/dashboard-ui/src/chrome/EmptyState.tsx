import React from 'react';
import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

export interface EmptyStateProps {
  /** Icon or illustration rendered above the headline. */
  icon?: ReactNode;
  /** Headline text. */
  title: string;
  /** Description text. */
  description?: string;
  /** Primary call-to-action (e.g. "Create first entry"). */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty state for lists with zero records. Shows an icon, headline,
 * description, and optional CTA button.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.disabled', fontSize: 48 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          sx={{ mt: 3, textTransform: 'none' }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
