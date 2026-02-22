import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Collapse, Chip } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface SqlPreviewProps {
  policyId: number;
  /** Callback to get compiled SQL on demand */
  onPreview?: () => Promise<string | null>;
  /** Static SQL to show */
  sql?: string;
}

export function SqlPreview({ policyId, onPreview, sql: staticSql }: SqlPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [sqlContent, setSqlContent] = useState(staticSql ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staticSql) setSqlContent(staticSql);
  }, [staticSql]);

  const handlePreview = async () => {
    if (!expanded) {
      setExpanded(true);
      if (onPreview) {
        setLoading(true);
        setError(null);
        try {
          const result = await onPreview();
          if (result) setSqlContent(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlContent);
  };

  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.5,
          cursor: 'pointer',
        }}
        onClick={handlePreview}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" fontWeight={600}>
            SQL Preview
          </Typography>
          {sqlContent && (
            <Chip label="compiled" size="small" color="success" variant="outlined" sx={{ height: 20 }} />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {loading && (
            <Typography variant="caption" color="text.secondary">
              Compiling...
            </Typography>
          )}
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
          {sqlContent && !loading && (
            <Box sx={{ position: 'relative' }}>
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{ position: 'absolute', top: 4, right: 4 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  borderRadius: 1,
                  p: 1.5,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: 200,
                  whiteSpace: 'pre-wrap',
                  m: 0,
                }}
              >
                {sqlContent}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
