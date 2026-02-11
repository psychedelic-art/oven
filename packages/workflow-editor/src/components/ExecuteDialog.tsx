import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Chip,
  Alert,
  Switch,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import type { PayloadProperty } from '@oven/module-workflows/types';
import { generatePayloadExample, inferSchemaFromPayload } from '../utils/payload-utils';

interface ExecuteDialogProps {
  open: boolean;
  onClose: () => void;
  onExecute: (payload: Record<string, unknown>) => Promise<void>;
  /** Payload schema from the workflow definition */
  payloadSchema?: PayloadProperty[];
  workflowName?: string;
  /** Workflow ID for fetching last execution payload */
  workflowId?: number;
  /** Last execution's trigger payload (for auto-inference) */
  lastPayload?: Record<string, unknown>;
  /** Callback to apply an inferred schema back to the trigger node */
  onApplyInferredSchema?: (schema: PayloadProperty[]) => void;
}

const TYPE_COLORS: Record<string, string> = {
  string: '#2196f3',
  number: '#ff9800',
  boolean: '#4caf50',
  object: '#9c27b0',
  array: '#e91e63',
};

/**
 * Dialog for executing a workflow with payload input.
 * Auto-generates form fields from the workflow's payloadSchema.
 * Falls back to a raw JSON textarea if no schema is defined.
 * Supports: advanced JSON mode, copy JSON example, auto-inference from last execution.
 */
export function ExecuteDialog({
  open,
  onClose,
  onExecute,
  payloadSchema,
  workflowName,
  lastPayload,
  onApplyInferredSchema,
}: ExecuteDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [rawJson, setRawJson] = useState('{}');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [inferredSchema, setInferredSchema] = useState<PayloadProperty[] | null>(null);

  const hasSchema = payloadSchema && payloadSchema.length > 0;

  // Initialize default values from schema
  useMemo(() => {
    if (hasSchema) {
      const defaults: Record<string, unknown> = {};
      for (const prop of payloadSchema!) {
        if (prop.defaultValue !== undefined) {
          defaults[prop.name] = prop.defaultValue;
        } else {
          switch (prop.type) {
            case 'string': defaults[prop.name] = ''; break;
            case 'number': defaults[prop.name] = 0; break;
            case 'boolean': defaults[prop.name] = false; break;
            case 'object': defaults[prop.name] = {}; break;
            case 'array': defaults[prop.name] = []; break;
          }
        }
      }
      setValues(defaults);
      setRawJson(JSON.stringify(defaults, null, 2));
    }
  }, [payloadSchema]);

  // Pre-fill raw JSON from last payload when no schema
  useMemo(() => {
    if (!hasSchema && lastPayload && Object.keys(lastPayload).length > 0) {
      setRawJson(JSON.stringify(lastPayload, null, 2));
    }
  }, [lastPayload, hasSchema]);

  const updateValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyExample = () => {
    if (!hasSchema) return;
    const example = generatePayloadExample(payloadSchema!);
    navigator.clipboard.writeText(JSON.stringify(example, null, 2));
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const handleInferSchema = () => {
    if (!lastPayload) return;
    const inferred = inferSchemaFromPayload(lastPayload);
    setInferredSchema(inferred);
  };

  const handleApplyInferred = () => {
    if (inferredSchema && onApplyInferredSchema) {
      onApplyInferredSchema(inferredSchema);
      setInferredSchema(null);
    }
  };

  // Sync raw JSON back to form values on advanced mode blur
  const handleAdvancedJsonBlur = () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed === 'object' && parsed !== null) {
        setValues(parsed);
      }
    } catch {
      // Invalid JSON — ignore until execution
    }
  };

  // Sync form values to raw JSON when switching to advanced mode
  const handleToggleAdvanced = () => {
    if (!advancedMode && hasSchema) {
      setRawJson(JSON.stringify(values, null, 2));
    }
    setAdvancedMode(!advancedMode);
  };

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);

    try {
      let payload: Record<string, unknown>;

      if (advancedMode || !hasSchema) {
        try {
          payload = JSON.parse(rawJson);
        } catch {
          setError('Invalid JSON payload');
          setExecuting(false);
          return;
        }
      } else {
        payload = { ...values };
        // Type coercion based on schema
        for (const prop of payloadSchema!) {
          if (prop.type === 'number' && typeof payload[prop.name] === 'string') {
            payload[prop.name] = Number(payload[prop.name]);
          }
        }
      }

      // Validate required fields
      if (hasSchema && !advancedMode) {
        const missing = payloadSchema!
          .filter((p) => p.required && (payload[p.name] === undefined || payload[p.name] === ''))
          .map((p) => p.name);
        if (missing.length > 0) {
          setError(`Required fields missing: ${missing.join(', ')}`);
          setExecuting(false);
          return;
        }
      }

      await onExecute(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PlayArrowIcon color="success" />
        <Box sx={{ flex: 1 }}>Execute {workflowName ?? 'Workflow'}</Box>

        {/* Mode toggle + copy example */}
        {hasSchema && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={copiedExample ? 'Copied!' : 'Copy JSON example to clipboard'}>
              <IconButton size="small" onClick={handleCopyExample}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Form
            </Typography>
            <Switch
              size="small"
              checked={advancedMode}
              onChange={handleToggleAdvanced}
            />
            <Typography variant="caption" color="text.secondary">
              JSON
            </Typography>
          </Box>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {hasSchema && !advancedMode ? (
          /* ────── FORM MODE ────── */
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Fill in the payload properties for this workflow:
            </Typography>

            {payloadSchema!.map((prop) => (
              <Box key={prop.name} sx={{ mb: 2 }}>
                {prop.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(values[prop.name])}
                        onChange={(e: any) => updateValue(prop.name, e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">{prop.name}</Typography>
                        {prop.required && <Typography color="error" variant="caption">*</Typography>}
                        <Chip
                          label={prop.type}
                          size="small"
                          sx={{ height: 16, fontSize: 8, bgcolor: TYPE_COLORS[prop.type], color: '#fff' }}
                        />
                      </Box>
                    }
                  />
                ) : prop.type === 'object' || prop.type === 'array' ? (
                  <TextField
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {prop.name}
                        {prop.required && <Typography color="error" component="span">*</Typography>}
                        <Chip
                          label={prop.type}
                          size="small"
                          sx={{ height: 16, fontSize: 8, bgcolor: TYPE_COLORS[prop.type], color: '#fff' }}
                        />
                      </Box>
                    }
                    value={typeof values[prop.name] === 'string' ? values[prop.name] : JSON.stringify(values[prop.name], null, 2)}
                    onChange={(e: any) => {
                      try {
                        updateValue(prop.name, JSON.parse(e.target.value));
                      } catch {
                        updateValue(prop.name, e.target.value);
                      }
                    }}
                    fullWidth
                    multiline
                    rows={3}
                    helperText={prop.description}
                    sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
                  />
                ) : (
                  <TextField
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {prop.name}
                        {prop.required && <Typography color="error" component="span">*</Typography>}
                        <Chip
                          label={prop.type}
                          size="small"
                          sx={{ height: 16, fontSize: 8, bgcolor: TYPE_COLORS[prop.type], color: '#fff' }}
                        />
                      </Box>
                    }
                    type={prop.type === 'number' ? 'number' : 'text'}
                    value={values[prop.name] ?? ''}
                    onChange={(e: any) => updateValue(prop.name, e.target.value)}
                    fullWidth
                    helperText={prop.description}
                  />
                )}
              </Box>
            ))}
          </Box>
        ) : hasSchema && advancedMode ? (
          /* ────── ADVANCED JSON MODE (schema exists) ────── */
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              Edit payload as raw JSON (synced with form fields):
            </Typography>
            <TextField
              label="Payload (JSON)"
              value={rawJson}
              onChange={(e: any) => setRawJson(e.target.value)}
              onBlur={handleAdvancedJsonBlur}
              fullWidth
              multiline
              rows={10}
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
            />
          </Box>
        ) : (
          /* ────── NO SCHEMA MODE ────── */
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              No payload schema defined. Enter raw JSON payload:
            </Typography>
            <TextField
              label="Payload (JSON)"
              value={rawJson}
              onChange={(e: any) => setRawJson(e.target.value)}
              fullWidth
              multiline
              rows={6}
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
              helperText="Tip: Define a payload schema on the Trigger node for a better experience"
            />

            {/* Auto-infer from last execution */}
            {lastPayload && Object.keys(lastPayload).length > 0 && !inferredSchema && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleInferSchema}
                  variant="outlined"
                  color="info"
                >
                  Auto-detect schema from last execution
                </Button>
              </>
            )}

            {/* Show inferred schema preview */}
            {inferredSchema && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9' }}>
                <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                  Inferred Schema:
                </Typography>
                {inferredSchema.map((prop) => (
                  <Box key={prop.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Chip
                      label={prop.type}
                      size="small"
                      sx={{ height: 16, fontSize: 8, bgcolor: TYPE_COLORS[prop.type], color: '#fff' }}
                    />
                    <Typography variant="body2">{prop.name}</Typography>
                  </Box>
                ))}
                {onApplyInferredSchema && (
                  <Button
                    size="small"
                    variant="contained"
                    color="info"
                    sx={{ mt: 1 }}
                    onClick={handleApplyInferred}
                  >
                    Apply to Trigger Node
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={executing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleExecute}
          disabled={executing}
          startIcon={<PlayArrowIcon />}
        >
          {executing ? 'Executing...' : 'Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
