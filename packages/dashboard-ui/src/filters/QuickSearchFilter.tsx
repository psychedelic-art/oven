import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';

export type QuickSearchFilterProps = {
  source: string;
  label: string;
  value: string;
  onChange: (source: string, value: string | null) => void;
  debounceMs?: number;
};

export function QuickSearchFilter({
  source,
  label,
  value,
  onChange,
  debounceMs = 400,
}: QuickSearchFilterProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(source, next || null);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <TextField
      size="small"
      label={label}
      value={localValue}
      onChange={handleChange}
      sx={{ minWidth: 200 }}
    />
  );
}
