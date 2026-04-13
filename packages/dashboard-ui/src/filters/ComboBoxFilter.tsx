import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import type { StatusChoice } from './types';

export type ComboBoxFilterProps = {
  source: string;
  label: string;
  value: string | null;
  choices: StatusChoice[];
  onChange: (source: string, value: string | null) => void;
  loading?: boolean;
};

export function ComboBoxFilter({
  source,
  label,
  value,
  choices,
  onChange,
  loading = false,
}: ComboBoxFilterProps) {
  const selectedOption = choices.find((c) => String(c.id) === String(value)) ?? null;

  return (
    <Autocomplete
      size="small"
      options={choices}
      getOptionLabel={(opt) => opt.name}
      value={selectedOption}
      loading={loading}
      onChange={(_event, newValue) => {
        onChange(source, newValue ? String(newValue.id) : null);
      }}
      noOptionsText="No results"
      renderInput={(params) => (
        <TextField {...params} label={label} />
      )}
      sx={{ minWidth: 160 }}
    />
  );
}
