import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';

interface CompileDialogProps {
  open: boolean;
  onClose: () => void;
  workflowId: number;
  workflowSlug?: string;
}

export function CompileDialog({
  open,
  onClose,
  workflowId,
  workflowSlug,
}: CompileDialogProps) {
  const [code, setCode] = useState<string | null>(null);
  const [filename, setFilename] = useState('workflow.ts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Options
  const [includeComments, setIncludeComments] = useState(true);
  const [strategyMode, setStrategyMode] = useState<'network' | 'direct' | 'none'>('network');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCode(null);

    try {
      const res = await fetch(`/api/workflows/${workflowId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: {
            includeComments,
            strategyMode,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Compilation failed (${res.status})`);
      }

      const data = await res.json();
      setCode(data.code);
      setFilename(data.filename ?? 'workflow.ts');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select all in the pre element
    }
  };

  const handleDownload = () => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCode(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon color="primary" />
        <Typography variant="h6" component="span">
          Compile Workflow
        </Typography>
        {workflowSlug && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            ({workflowSlug})
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {/* Options */}
        {!code && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Compiler Options
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                  />
                }
                label="Include comments"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Strategy:
                </Typography>
                <Select
                  size="small"
                  value={strategyMode}
                  onChange={(e) => setStrategyMode(e.target.value as any)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="network">Network</MenuItem>
                  <MenuItem value="direct">Direct</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </Select>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Generates standalone TypeScript code from the workflow definition.
              This does NOT replace the workflow engine — it's an additional export tool.
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Generated Code */}
        {code && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Generated Code ({filename})
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy to Clipboard'}>
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download .ts file">
                <IconButton size="small" onClick={handleDownload}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              component="pre"
              sx={{
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 500,
                fontSize: 11,
                fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.5,
                '& .keyword': { color: '#569cd6' },
                '& .comment': { color: '#6a9955' },
              }}
            >
              {code}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!code ? (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CodeIcon />}
          >
            {loading ? 'Generating...' : 'Generate Code'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => {
              setCode(null);
              setError(null);
            }}
          >
            Regenerate
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
