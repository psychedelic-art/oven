import React from 'react';
import { Autocomplete, TextField, Box } from '@mui/material';
import type { StatusChoice } from './types';

const colourMap: Record<string, string> = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#0288d1',
  default: '#757575',
};

export type StatusFilterProps = {
  source: string;
  label: string;
  value: string | null;
  choices: StatusChoice[];
  onChange: (source: string, value: string | null) => void;
};

export function StatusFilter({
  source,
  label,
  value,
  choices,
  onChange,
}: StatusFilterProps) {
  const selectedOption = choices.find((c) => String(c.id) === String(value)) ?? null;

  return (
    <Autocomplete
      size="small"
      options={choices}
      getOptionLabel={(opt) => opt.name}
      value={selectedOption}
      onChange={(_event, newValue) => {
        onChange(source, newValue ? String(newValue.id) : null);
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <li key={key} {...rest}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: colourMap[option.colour ?? 'default'],
                mr: 1,
                flexShrink: 0,
              }}
            />
            {option.name}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} />
      )}
      sx={{ minWidth: 140 }}
    />
  );
}
