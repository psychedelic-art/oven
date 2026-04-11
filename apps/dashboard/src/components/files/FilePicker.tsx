'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
  IconButton,
  Select,
  MenuItem,
  Pagination,
  Paper,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { FILE_BUCKETS } from './constants';
import FileUploader from './FileUploader';

interface FilePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: { id: number; publicUrl: string; filename: string; mimeType: string }) => void;
  folder?: string;
  accept?: string;
  title?: string;
}

interface FileItem {
  id: number;
  publicUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: string | null;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 24;

export default function FilePicker({
  open,
  onClose,
  onSelect,
  folder: defaultFolder,
  accept,
  title = 'Select a File',
}: FilePickerProps) {
  const [tab, setTab] = useState(0);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [folderFilter, setFolderFilter] = useState(defaultFolder ?? '');
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (folderFilter) filter.folder = folderFilter;
      if (accept) filter.mimeType = accept;

      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;
      const params = new URLSearchParams({
        filter: JSON.stringify(filter),
        sort: JSON.stringify(['createdAt', 'DESC']),
        range: JSON.stringify([start, end]),
      });

      const res = await fetch(`/api/files?${params}`);
      if (!res.ok) return;

      const contentRange = res.headers.get('Content-Range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) setTotal(parseInt(match[1], 10));
      }

      const data = await res.json();
      setFiles(data);
    } finally {
      setLoading(false);
    }
  }, [folderFilter, accept, page]);

  useEffect(() => {
    if (open && tab === 0) {
      fetchFiles();
    }
  }, [open, tab, fetchFiles]);

  const handleFolderChange = (e: SelectChangeEvent<string>) => {
    setFolderFilter(e.target.value);
    setPage(1);
  };

  const handleSelect = (file: FileItem) => {
    onSelect({
      id: file.id,
      publicUrl: file.publicUrl,
      filename: file.filename,
      mimeType: file.mimeType,
    });
    onClose();
  };

  const handleUploadComplete = (file: any) => {
    onSelect({
      id: file.id,
      publicUrl: file.publicUrl,
      filename: file.filename,
      mimeType: file.mimeType,
    });
    onClose();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Browse Files" />
          <Tab label="Upload New" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <Select
                size="small"
                value={folderFilter}
                onChange={handleFolderChange}
                displayEmpty
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All Folders</MenuItem>
                {FILE_BUCKETS.map((b) => (
                  <MenuItem key={b.folder} value={b.folder}>
                    {b.label}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary">
                {total} file{total !== 1 ? 's' : ''}
              </Typography>
            </Box>

            {loading ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Loading...
              </Typography>
            ) : files.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No files found
              </Typography>
            ) : (
              <ImageList cols={4} gap={12}>
                {files.map((file) => (
                  <ImageListItem
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2,
                      },
                    }}
                  >
                    {file.mimeType?.startsWith('image/') ? (
                      <Box
                        component="img"
                        src={file.publicUrl}
                        alt={file.filename}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: 120,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.100',
                        }}
                      >
                        <InsertDriveFileIcon sx={{ fontSize: 48, color: 'action.active' }} />
                      </Box>
                    )}
                    <ImageListItemBar
                      title={file.filename}
                      subtitle={formatBytes(file.sizeBytes)}
                      sx={{
                        '& .MuiImageListItemBar-title': { fontSize: 12 },
                        '& .MuiImageListItemBar-subtitle': { fontSize: 11 },
                      }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  size="small"
                />
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <FileUploader
              folder={defaultFolder ?? 'uploads'}
              onUploadComplete={handleUploadComplete}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
