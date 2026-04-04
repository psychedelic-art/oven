'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Chip,
  Pagination,
  Skeleton,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { FILE_BUCKETS } from './constants';
import FileUploader from './FileUploader';

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

const ICON_MAP: Record<string, React.ReactNode> = {
  Image: <ImageIcon />,
  AudioFile: <AudioFileIcon />,
  Description: <DescriptionIcon />,
  AttachFile: <AttachFileIcon />,
  CloudUpload: <CloudUploadIcon />,
};

const PAGE_SIZE = 24;

export default function FileManager() {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [bucketCounts, setBucketCounts] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countsLoading, setCountsLoading] = useState(true);

  // Fetch bucket counts
  useEffect(() => {
    const fetchCounts = async () => {
      setCountsLoading(true);
      const counts: Record<string, number> = {};
      await Promise.all(
        FILE_BUCKETS.map(async (bucket) => {
          try {
            const params = new URLSearchParams({
              filter: JSON.stringify({ folder: bucket.folder }),
              range: JSON.stringify([0, 0]),
            });
            const res = await fetch(`/api/files?${params}`);
            const contentRange = res.headers.get('Content-Range');
            if (contentRange) {
              const match = contentRange.match(/\/(\d+)/);
              if (match) counts[bucket.folder] = parseInt(match[1], 10);
            }
          } catch {
            counts[bucket.folder] = 0;
          }
        }),
      );
      setBucketCounts(counts);
      setCountsLoading(false);
    };
    fetchCounts();
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string> = {};
      if (selectedFolder) filter.folder = selectedFolder;

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
  }, [selectedFolder, page]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleBucketClick = (folder: string) => {
    setSelectedFolder((prev) => (prev === folder ? '' : folder));
    setPage(1);
  };

  const handleUploadComplete = () => {
    fetchFiles();
    // Refresh counts
    setBucketCounts({});
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        FILE_BUCKETS.map(async (bucket) => {
          try {
            const params = new URLSearchParams({
              filter: JSON.stringify({ folder: bucket.folder }),
              range: JSON.stringify([0, 0]),
            });
            const res = await fetch(`/api/files?${params}`);
            const contentRange = res.headers.get('Content-Range');
            if (contentRange) {
              const match = contentRange.match(/\/(\d+)/);
              if (match) counts[bucket.folder] = parseInt(match[1], 10);
            }
          } catch {
            counts[bucket.folder] = 0;
          }
        }),
      );
      setBucketCounts(counts);
    };
    fetchCounts();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        File Manager
      </Typography>

      {/* Bucket Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {FILE_BUCKETS.map((bucket) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={bucket.folder}>
            <Paper
              variant="outlined"
              onClick={() => handleBucketClick(bucket.folder)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderLeft: 4,
                borderLeftColor: bucket.color,
                borderColor: selectedFolder === bucket.folder ? 'primary.main' : undefined,
                bgcolor: selectedFolder === bucket.folder ? 'action.selected' : 'background.paper',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: bucket.color, display: 'flex' }}>
                  {ICON_MAP[bucket.icon]}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {bucket.label}
                </Typography>
              </Box>
              {countsLoading ? (
                <Skeleton width={40} height={24} />
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {bucketCounts[bucket.folder] ?? 0}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filter chip */}
      {selectedFolder && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Folder: ${selectedFolder}`}
            onDelete={() => { setSelectedFolder(''); setPage(1); }}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Upload Zone */}
      <Box sx={{ mb: 3 }}>
        <FileUploader
          compact
          folder={selectedFolder || 'uploads'}
          onUploadComplete={handleUploadComplete}
        />
      </Box>

      {/* File Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">Loading files...</Typography>
        </Box>
      ) : files.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <InsertDriveFileIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No files found
          </Typography>
        </Paper>
      ) : (
        <ImageList cols={4} gap={16}>
          {files.map((file) => (
            <ImageListItem
              key={file.id}
              onClick={() => { window.location.hash = `#/files/${file.id}/show`; }}
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
                    height: 140,
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 140,
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
                  '& .MuiImageListItemBar-title': { fontSize: 13 },
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
          />
        </Box>
      )}
    </Box>
  );
}
