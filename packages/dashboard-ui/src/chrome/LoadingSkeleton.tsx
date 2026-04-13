import React from 'react';
import { Box, Skeleton } from '@mui/material';

export interface LoadingSkeletonProps {
  /** Shape variant: list (datagrid rows), form (stacked inputs), detail (mixed). */
  variant?: 'list' | 'form' | 'detail';
  /** Number of skeleton rows to show. Defaults to 5. */
  rows?: number;
}

/**
 * Loading skeleton for dashboard pages. Renders a datagrid-shaped,
 * form-shaped, or detail-shaped skeleton placeholder.
 */
export function LoadingSkeleton({ variant = 'list', rows = 5 }: LoadingSkeletonProps) {
  if (variant === 'form') {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i}>
            <Skeleton variant="text" width={120} height={16} sx={{ mb: 0.5 }} />
            <Skeleton variant="rounded" height={40} />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="80%" height={16} />
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="70%" height={16} />
      </Box>
    );
  }

  // Default: list variant (datagrid-shaped)
  return (
    <Box sx={{ p: 1 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', gap: 2, px: 1, py: 1, mb: 0.5 }}>
        <Skeleton variant="text" width={40} height={16} />
        <Skeleton variant="text" width="30%" height={16} />
        <Skeleton variant="text" width="20%" height={16} />
        <Skeleton variant="text" width="15%" height={16} />
        <Skeleton variant="text" width={60} height={16} sx={{ ml: 'auto' }} />
      </Box>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: 2,
            px: 1,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={40} height={16} />
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="20%" height={16} />
          <Skeleton variant="text" width="15%" height={16} />
          <Skeleton variant="rounded" width={60} height={24} sx={{ ml: 'auto' }} />
        </Box>
      ))}
    </Box>
  );
}
