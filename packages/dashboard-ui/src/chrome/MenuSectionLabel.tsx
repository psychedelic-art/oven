import React from 'react';
import { Typography, Divider, Box } from '@mui/material';

export interface MenuSectionLabelProps {
  /** Section label text (e.g. "AI Services", "Tenants"). */
  label: string;
  /** Whether to render the Divider above the label. Defaults to true. */
  showDivider?: boolean;
}

/**
 * Shared menu section label. Replaces the hand-rolled
 * `<Divider> + <Box><Typography variant="overline"></Box>` pattern
 * that was repeated 18 times in CustomMenu.tsx.
 */
export function MenuSectionLabel({ label, showDivider = true }: MenuSectionLabelProps) {
  return (
    <>
      {showDivider && <Divider sx={{ my: 1 }} />}
      <Box sx={{ px: 2, pb: 0.5, ...(showDivider ? {} : { pt: 2 }) }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          {label}
        </Typography>
      </Box>
    </>
  );
}
