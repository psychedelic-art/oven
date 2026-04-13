import React from 'react';
import { TextField, Box } from '@mui/material';

export type DateRangeFilterProps = {
  source: string;
  label: string;
  value: { gte?: string; lte?: string } | null;
  onChange: (source: string, value: { gte?: string; lte?: string } | null) => void;
};

export function DateRangeFilter({
  source,
  label,
  value,
  onChange,
}: DateRangeFilterProps) {
  const gte = value?.gte ?? '';
  const lte = value?.lte ?? '';

  const handleGteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (!next && !lte) {
      onChange(source, null);
    } else {
      onChange(source, { gte: next || undefined, lte: lte || undefined });
    }
  };

  const handleLteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (!gte && !next) {
      onChange(source, null);
    } else {
      onChange(source, { gte: gte || undefined, lte: next || undefined });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        size="small"
        type="date"
        label={`${label} from`}
        value={gte}
        onChange={handleGteChange}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 140 }}
      />
      <TextField
        size="small"
        type="date"
        label={`${label} to`}
        value={lte}
        onChange={handleLteChange}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 140 }}
      />
    </Box>
  );
}
