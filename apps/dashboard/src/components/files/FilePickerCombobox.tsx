'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';

interface FileOption {
  id: number;
  publicUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: string | null;
}

interface FilePickerComboboxProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  size?: 'small' | 'medium';
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon sx={{ fontSize: 20, color: 'success.main' }} />;
  if (mimeType?.startsWith('audio/')) return <AudioFileIcon sx={{ fontSize: 20, color: 'warning.main' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: 20, color: 'action.active' }} />;
}

export default function FilePickerCombobox({
  value,
  onChange,
  folder,
  accept,
  label = 'Select file',
  placeholder = 'Search files or paste URL...',
  helperText,
  size = 'small',
}: FilePickerComboboxProps) {
  const [options, setOptions] = useState<FileOption[]>([]);
  const [inputValue, setInputValue] = useState(value || '');
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (folder) filter.folder = folder;
      if (accept) filter.mimeType = accept;
      if (search) filter.q = search;

      const params = new URLSearchParams({
        filter: JSON.stringify(filter),
        sort: JSON.stringify(['createdAt', 'DESC']),
        range: JSON.stringify([0, 19]),
      });

      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [folder, accept]);

  // Initial load
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Debounced search
  useEffect(() => {
    if (!inputValue || inputValue.startsWith('http') || inputValue.startsWith('data:')) return;
    const timer = setTimeout(() => fetchFiles(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue, fetchFiles]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, newValue, reason) => {
        setInputValue(newValue);
        // If user types a URL directly, pass it through
        if (reason === 'input' && (newValue.startsWith('http') || newValue.startsWith('data:'))) {
          onChange(newValue);
        }
      }}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else if (newValue) {
          onChange(newValue.publicUrl);
          setInputValue(newValue.filename);
        }
      }}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.filename
      }
      isOptionEqualToValue={(option, val) =>
        typeof val === 'string' ? option.publicUrl === val : option.id === val.id
      }
      renderOption={(props, option) => {
        if (typeof option === 'string') return null;
        return (
          <Box component="li" {...props} key={option.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
            {option.mimeType?.startsWith('image/') ? (
              <Box
                component="img"
                src={option.publicUrl}
                alt=""
                sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100', borderRadius: 0.5, flexShrink: 0 }}>
                {getFileIcon(option.mimeType)}
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {option.filename}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(option.sizeBytes)}
                </Typography>
                {option.folder && (
                  <Chip label={option.folder} size="small" sx={{ height: 16, fontSize: 10 }} />
                )}
              </Box>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          size={size}
          fullWidth
        />
      )}
      sx={{ flex: 1 }}
    />
  );
}
