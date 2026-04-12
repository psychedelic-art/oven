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
import {
  resolveExecutionStatusColor,
  formatCostCents,
  type PlaygroundExecutionRecord,
} from '@oven/module-ai/view/playground-execution-record';

export default function PlaygroundExecutionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <FunctionField<PlaygroundExecutionRecord>
          label="Type"
          render={(record) => (
            <Chip label={record.type} size="small" color="primary" />
          )}
        />
        <TextField source="model" />
        <FunctionField<PlaygroundExecutionRecord>
          label="Status"
          render={(record) => (
            <Chip
              label={record.status}
              size="small"
              color={resolveExecutionStatusColor(record.status)}
            />
          )}
        />
        <FunctionField<PlaygroundExecutionRecord>
          label="Cost"
          render={(record) => formatCostCents(record.costCents)}
        />
        <NumberField source="latencyMs" label="Latency (ms)" />
        <DateField source="createdAt" showTime />

        <FunctionField<PlaygroundExecutionRecord>
          label="Input"
          render={(record) => (
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

        <FunctionField<PlaygroundExecutionRecord>
          label="Output"
          render={(record) => {
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
        <FunctionField<PlaygroundExecutionRecord>
          label="Error"
          render={(record) =>
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
