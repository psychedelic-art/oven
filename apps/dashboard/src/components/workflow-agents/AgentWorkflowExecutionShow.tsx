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

export function AgentWorkflowExecutionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <NumberField source="id" />
        <NumberField source="workflowId" label="Workflow" />
        <FunctionField
          label="Status"
          render={(record: Record<string, unknown>) => (
            <Chip label={record.status as string} size="small" />
          )}
        />
        <TextField source="currentState" label="Current Node" />
        <NumberField source="stepsExecuted" label="Steps Executed" />
        <TextField source="triggerSource" label="Trigger" />
        <DateField source="startedAt" showTime />
        <DateField source="completedAt" showTime />
        <FunctionField
          label="Error"
          render={(record: Record<string, unknown>) =>
            record.error ? (
              <Box sx={{ p: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1, fontFamily: 'monospace', fontSize: 12 }}>
                {record.error as string}
              </Box>
            ) : '—'
          }
        />
        <FunctionField
          label="Context (Accumulated State)"
          render={(record: Record<string, unknown>) => (
            <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: 11, maxHeight: 400, overflow: 'auto' }}>
              <pre>{JSON.stringify(record.context, null, 2)}</pre>
            </Box>
          )}
        />
        <FunctionField
          label="Node Executions"
          render={(record: Record<string, unknown>) => {
            const nodes = (record as Record<string, unknown>).nodeExecutions as Array<Record<string, unknown>> | undefined;
            if (!nodes || nodes.length === 0) return <Typography variant="body2">No node executions</Typography>;
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {nodes.map((node, i) => (
                  <Box key={i} sx={{ p: 1, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                      <Chip label={node.nodeId as string} size="small" sx={{ fontFamily: 'monospace' }} />
                      <Chip label={node.nodeType as string} size="small" variant="outlined" />
                      <Chip
                        label={node.status as string}
                        size="small"
                        color={node.status === 'completed' ? 'success' : node.status === 'failed' ? 'error' : 'default'}
                      />
                      {node.durationMs && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {node.durationMs}ms
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            );
          }}
        />
      </SimpleShowLayout>
    </Show>
  );
}
