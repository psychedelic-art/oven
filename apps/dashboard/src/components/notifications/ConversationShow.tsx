'use client';

import {
  Show,
  useRecordContext,
  NumberField,
  TextField,
  DateField,
  SimpleShowLayout,
  FunctionField,
} from 'react-admin';
import { Box, Paper, Typography, Chip } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Message {
  id: number;
  direction: string;
  messageType: string;
  content: { text?: string };
  status: string;
  createdAt: string;
}

function DeliveryStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'delivered':
      return <DoneAllIcon sx={{ fontSize: 14 }} color="action" />;
    case 'read':
      return <DoneAllIcon sx={{ fontSize: 14 }} color="success" />;
    case 'failed':
      return <ErrorOutlineIcon sx={{ fontSize: 14 }} color="error" />;
    default:
      return <DoneIcon sx={{ fontSize: 14 }} color="action" />;
  }
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

function MessageThread() {
  const record = useRecordContext<{ messages?: Message[] }>();
  const messages = record?.messages ?? [];

  if (messages.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        No messages in this conversation.
      </Typography>
    );
  }

  return (
    <Box
      role="log"
      aria-live="polite"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, maxHeight: 500, overflow: 'auto' }}
    >
      {messages.map((m) => (
        <Box
          key={m.id}
          sx={{
            alignSelf: m.direction === 'inbound' ? 'flex-start' : 'flex-end',
            maxWidth: '70%',
          }}
        >
          <Paper
            elevation={1}
            sx={{
              px: 2,
              py: 1,
              bgcolor: m.direction === 'inbound' ? 'action.hover' : 'primary.light',
              color: m.direction === 'inbound' ? 'text.primary' : 'primary.contrastText',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">{m.content?.text ?? '[non-text message]'}</Typography>
          </Paper>
          <Box
            sx={{
              display: 'flex',
              justifyContent: m.direction === 'inbound' ? 'flex-start' : 'flex-end',
              gap: 0.5,
              mt: 0.25,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(m.createdAt)}
            </Typography>
            {m.direction === 'outbound' && <DeliveryStatusIcon status={m.status} />}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  escalated: 'warning',
  closed: 'default',
};

export default function ConversationShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" label="ID" />
        <NumberField source="tenantId" label="Tenant ID" />
        <TextField source="channelType" label="Channel" />
        <TextField source="externalUserId" label="External User" />
        <FunctionField
          label="Status"
          render={(record: { status?: string }) => (
            <Chip
              label={record.status}
              size="small"
              color={statusColors[record.status ?? ''] ?? 'default'}
            />
          )}
        />
        <DateField source="createdAt" label="Created" showTime />

        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="h6">Messages</Typography>
        </Box>
        <MessageThread />
      </SimpleShowLayout>
    </Show>
  );
}
