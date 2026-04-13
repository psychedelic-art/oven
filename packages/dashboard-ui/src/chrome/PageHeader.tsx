import React from 'react';
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export interface PageHeaderProps {
  /** Page title. */
  title: string;
  /** Optional subtitle or breadcrumb text. */
  subtitle?: string;
  /** Optional description text rendered below the title. */
  description?: string;
  /** Slot for a primary action button (top-right). */
  action?: ReactNode;
}

/**
 * Consistent page header for dashboard list/edit/show/custom pages.
 * MUI sx-only. No style={}.
 */
export function PageHeader({ title, subtitle, description, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        px: 2,
        py: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            {subtitle}
          </Typography>
        )}
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ shrink: 0 }}>{action}</Box>}
    </Box>
  );
}
