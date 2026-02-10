'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Chip } from '@mui/material';

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  active: 'success',
  banned: 'error',
  inactive: 'default',
};

function formatPlayTime(seconds: number | null): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PlayerShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <TextField source="username" />
        <TextField source="displayName" label="Display Name" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={STATUS_COLORS[record?.status] || 'default'}
            />
          )}
        />
        <FunctionField
          label="Total Play Time"
          render={(record: any) => formatPlayTime(record?.totalPlayTimeSeconds)}
        />
        <DateField source="lastSeenAt" label="Last Seen" showTime emptyText="Never" />
        <DateField source="createdAt" showTime label="Joined" />
        <DateField source="updatedAt" showTime label="Updated" />
      </SimpleShowLayout>
    </Show>
  );
}
