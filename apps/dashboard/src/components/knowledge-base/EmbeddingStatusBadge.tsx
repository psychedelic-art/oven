'use client';

import { useRecordContext } from 'react-admin';
import { Chip, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const statusConfig: Record<string, {
  label: string;
  color: 'success' | 'warning' | 'error' | 'default';
  icon: React.ReactElement;
  tooltip: string;
}> = {
  embedded: {
    label: 'Embedded',
    color: 'success',
    icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Entry has been embedded and is searchable via semantic search',
  },
  pending: {
    label: 'Pending',
    color: 'warning',
    icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Embedding is queued and will be processed shortly',
  },
  processing: {
    label: 'Processing',
    color: 'warning',
    icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Embedding is currently being generated',
  },
  failed: {
    label: 'Failed',
    color: 'error',
    icon: <ErrorIcon sx={{ fontSize: 14 }} />,
    tooltip: 'Embedding failed — entry is only searchable via keyword fallback',
  },
};

export default function EmbeddingStatusBadge() {
  const record = useRecordContext();
  if (!record) return null;

  const metadata = record.metadata as Record<string, unknown> | null;
  const status = (metadata?.embeddingStatus as string) ?? 'none';
  const config = statusConfig[status];

  if (!config) {
    return (
      <Tooltip title="No embedding — entry has not been embedded yet">
        <Chip
          label="None"
          size="small"
          variant="outlined"
          color="default"
          icon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
        />
      </Tooltip>
    );
  }

  const errorMsg = metadata?.embeddingError as string | undefined;
  const tooltipText = status === 'failed' && errorMsg
    ? `${config.tooltip}: ${errorMsg}`
    : config.tooltip;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        label={config.label}
        size="small"
        variant="outlined"
        color={config.color}
        icon={config.icon}
      />
    </Tooltip>
  );
}
