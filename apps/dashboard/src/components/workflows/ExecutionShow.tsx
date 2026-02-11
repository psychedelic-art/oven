'use client';

import {
  Show,
  SimpleShowLayout,
  TextField,
  NumberField,
  DateField,
  FunctionField,
  useRecordContext,
} from 'react-admin';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

const statusColors: Record<string, any> = {
  completed: 'success',
  running: 'warning',
  failed: 'error',
  cancelled: 'default',
  pending: 'info',
  skipped: 'default',
};

function ExecutionActions() {
  const record = useRecordContext();
  if (!record || record.status !== 'running') return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant="outlined"
        color="error"
        startIcon={<CancelIcon />}
        onClick={async () => {
          try {
            await fetch(`/api/workflow-executions/${record.id}/cancel`, {
              method: 'POST',
            });
            window.location.reload();
          } catch (err) {
            console.error('Failed to cancel:', err);
          }
        }}
        size="small"
      >
        Cancel Execution
      </Button>
    </Box>
  );
}

function NodeExecutionTimeline() {
  const record = useRecordContext();
  if (!record?.nodes || !Array.isArray(record.nodes)) return null;

  const nodes = record.nodes as any[];

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ p: 2, pb: 0 }}>
        Node Execution Timeline ({nodes.length} nodes)
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Node</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Input</TableCell>
              <TableCell>Output</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {nodes.map((node: any) => (
              <TableRow
                key={node.id}
                sx={{
                  bgcolor:
                    node.status === 'failed'
                      ? 'error.50'
                      : node.status === 'completed'
                        ? 'success.50'
                        : undefined,
                }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {node.nodeId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={node.nodeType} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={node.status}
                    size="small"
                    color={statusColors[node.status] ?? 'default'}
                  />
                </TableCell>
                <TableCell>
                  {node.durationMs != null ? `${node.durationMs}ms` : '-'}
                </TableCell>
                <TableCell>
                  {node.input ? (
                    <Box
                      component="pre"
                      sx={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        maxWidth: 200,
                        overflow: 'auto',
                        m: 0,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(node.input, null, 1)}
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {node.output ? (
                    <Box
                      component="pre"
                      sx={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        maxWidth: 200,
                        overflow: 'auto',
                        m: 0,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(node.output, null, 1)}
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {node.error ? (
                    <Typography variant="caption" color="error">
                      {node.error}
                    </Typography>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function ContextDisplay() {
  const record = useRecordContext();
  if (!record?.context) return null;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Execution Context
      </Typography>
      <Box
        component="pre"
        sx={{
          fontSize: 11,
          fontFamily: 'monospace',
          maxHeight: 300,
          overflow: 'auto',
          bgcolor: 'grey.50',
          p: 1,
          borderRadius: 1,
          m: 0,
        }}
      >
        {JSON.stringify(record.context, null, 2)}
      </Box>
    </Paper>
  );
}

export default function ExecutionShow() {
  return (
    <Show>
      <SimpleShowLayout>
        <ExecutionActions />
        <NumberField source="id" label="Execution ID" />
        <NumberField source="workflowId" label="Workflow ID" />
        <FunctionField
          label="Status"
          render={(record: any) => (
            <Chip
              label={record?.status}
              size="small"
              color={statusColors[record?.status] ?? 'default'}
            />
          )}
        />
        <TextField source="currentState" label="Current State" />
        <FunctionField
          label="Trigger"
          render={(record: any) =>
            record?.triggerEvent ? (
              <Chip
                label={record.triggerEvent}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace' }}
              />
            ) : 'Manual'
          }
        />
        <DateField source="startedAt" label="Started" showTime />
        <DateField source="completedAt" label="Completed" showTime />
        <FunctionField
          label="Error"
          render={(record: any) =>
            record?.error ? (
              <Typography color="error" variant="body2">
                {record.error}
              </Typography>
            ) : null
          }
        />
        <NodeExecutionTimeline />
        <ContextDisplay />
      </SimpleShowLayout>
    </Show>
  );
}
