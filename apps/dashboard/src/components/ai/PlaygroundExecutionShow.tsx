'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
} from 'react-admin';
import { Box, Typography, Chip } from '@mui/material';

const statusColors: Record<string, 'success' | 'error' | 'default'> = {
  completed: 'success',
  failed: 'error',
};

export default function PlaygroundExecutionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <FunctionField
          label="Type"
          render={(record: any) => (
            <Chip label={record.type} size="small" color="primary" />
          )}
        />
        <TextField source="model" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record.status}
              size="small"
              color={statusColors[record.status] ?? 'default'}
            />
          )}
        />
        <FunctionField
          label="Cost"
          render={(record: any) =>
            record.costCents != null ? `$${(record.costCents / 100).toFixed(2)}` : '-'
          }
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="createdAt" showTime />

        <FunctionField
          label="Input"
          render={(record: any) => (
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
              {JSON.stringify(record.input, null, 2)}
            </Box>
          )}
        />

        <FunctionField
          label="Output"
          render={(record: any) => {
            // If image type with a url, show image preview
            if (record.type === 'image' && record.output?.url) {
              return (
                <Box>
                  <Box
                    component="img"
                    src={record.output.url}
                    alt="Generated"
                    sx={{ maxWidth: '100%', maxHeight: 400, borderRadius: 1, mb: 1 }}
                  />
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
                    }}
                  >
                    {JSON.stringify(record.output, null, 2)}
                  </Box>
                </Box>
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
                {JSON.stringify(record.output, null, 2)}
              </Box>
            );
          }}
        />

        {/* Error field only shown if present */}
        <FunctionField
          label="Error"
          render={(record: any) =>
            record.error ? (
              <Typography color="error" variant="body2">
                {record.error}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                None
              </Typography>
            )
          }
        />
      </SimpleShowLayout>
    </Show>
  );
}
