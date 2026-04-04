'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Box, Typography, Link } from '@mui/material';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <TextField source="id" label="ID" />
        <TextField source="filename" label="Filename" />
        <TextField source="mimeType" label="MIME Type" />
        <FunctionField
          label="Size"
          render={(record: any) => formatBytes(record?.sizeBytes)}
        />
        <TextField source="folder" label="Folder" />
        <TextField source="sourceModule" label="Source Module" />
        <NumberField source="tenantId" label="Tenant ID" />

        <FunctionField
          label="Dimensions"
          render={(record: any) => {
            const w = record?.width;
            const h = record?.height;
            if (w != null && h != null) return `${w} x ${h}`;
            return '-';
          }}
        />

        <FunctionField
          label="Public URL"
          render={(record: any) =>
            record?.publicUrl ? (
              <Link href={record.publicUrl} target="_blank" rel="noopener noreferrer">
                {record.publicUrl}
              </Link>
            ) : (
              '-'
            )
          }
        />

        <FunctionField
          label="Preview"
          render={(record: any) => {
            if (!record?.publicUrl || !record.mimeType?.startsWith('image/')) return null;
            return (
              <Box
                component="img"
                src={record.publicUrl}
                alt={record.filename}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 500,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              />
            );
          }}
        />

        <FunctionField
          label="Metadata"
          render={(record: any) => {
            if (!record?.metadata) {
              return (
                <Typography variant="body2" color="text.secondary">
                  None
                </Typography>
              );
            }
            return (
              <Box
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  bgcolor: 'grey.50',
                  p: 2,
                  borderRadius: 1,
                  m: 0,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(record.metadata, null, 2)}
              </Box>
            );
          }}
        />

        <DateField source="createdAt" label="Created" showTime />
        <DateField source="updatedAt" label="Updated" showTime />
      </SimpleShowLayout>
    </Show>
  );
}
