'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { useFileUpload } from './useFileUpload';

interface FileUploaderProps {
  folder?: string;
  sourceModule?: string;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSizeBytes?: number;
  compact?: boolean;
  onUploadComplete?: (file: any) => void;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploader({
  folder = 'uploads',
  sourceModule,
  accept,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024,
  compact = false,
  onUploadComplete,
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { upload, uploading, error } = useFileUpload({
    folder,
    sourceModule,
    onComplete: (file) => {
      setUploadedFiles((prev) => [...prev, file]);
      onUploadComplete?.(file);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        try {
          await upload(file);
        } catch {
          // error is tracked by hook
        }
      }
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize: maxSizeBytes,
    disabled: uploading,
  });

  const clearUploaded = () => setUploadedFiles([]);

  if (compact) {
    return (
      <Paper
        {...getRootProps()}
        variant="outlined"
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: uploading ? 'default' : 'pointer',
          borderStyle: 'dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <CircularProgress size={20} />
        ) : (
          <CloudUploadIcon fontSize="small" color="action" />
        )}
        <Typography variant="body2" color="text.secondary">
          {uploading
            ? 'Uploading...'
            : isDragActive
              ? 'Drop file here'
              : 'Drop file or click to upload'}
        </Typography>
        {uploadedFiles.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto', alignItems: 'center' }}>
            {uploadedFiles.map((f) => (
              <Chip
                key={f.id}
                icon={<CheckCircleIcon />}
                label={f.filename}
                size="small"
                color="success"
                variant="outlined"
              />
            ))}
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearUploaded(); }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ ml: 'auto' }}>
            {error}
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper
      {...getRootProps()}
      variant="outlined"
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        cursor: uploading ? 'default' : 'pointer',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: isDragActive ? 'primary.main' : 'divider',
        bgcolor: isDragActive ? 'action.hover' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Uploading...
          </Typography>
        </>
      ) : (
        <>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'action.active' }} />
          <Typography variant="body1" color="text.primary">
            {isDragActive
              ? 'Drop files here'
              : 'Drag & drop files here, or click to browse'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Max {formatBytes(maxSizeBytes)} per file
          </Typography>
        </>
      )}
      {uploadedFiles.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {uploadedFiles.map((f) => (
            <Chip
              key={f.id}
              icon={<CheckCircleIcon />}
              label={`${f.filename} (${formatBytes(f.sizeBytes)})`}
              color="success"
              variant="outlined"
            />
          ))}
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearUploaded(); }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
}
