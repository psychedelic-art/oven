import React from 'react';
import { Box, Typography, Chip, Alert } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { ValidationResult, ValidationIssue } from '../validation/validateAgentWorkflow';

interface ValidationPanelProps {
  result: ValidationResult;
  onNavigateToNode: (nodeId: string) => void;
}

export function ValidationPanel({ result, onNavigateToNode }: ValidationPanelProps) {
  if (result.valid && result.warningCount === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="success" icon={<CheckCircleIcon />}>
          Workflow is valid — ready to execute
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
      {/* Summary */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
        {result.errorCount > 0 && (
          <Chip icon={<ErrorIcon />} label={`${result.errorCount} error${result.errorCount > 1 ? 's' : ''}`} color="error" size="small" />
        )}
        {result.warningCount > 0 && (
          <Chip icon={<WarningIcon />} label={`${result.warningCount} warning${result.warningCount > 1 ? 's' : ''}`} color="warning" size="small" />
        )}
      </Box>

      {/* Issue list */}
      {result.issues.map((issue, i) => (
        <Box
          key={i}
          sx={{
            px: 2, py: 1, borderBottom: 1, borderColor: 'divider',
            cursor: issue.nodeId ? 'pointer' : 'default',
            '&:hover': issue.nodeId ? { bgcolor: 'grey.50' } : {},
          }}
          onClick={() => issue.nodeId && onNavigateToNode(issue.nodeId)}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            {issue.severity === 'error'
              ? <ErrorIcon sx={{ fontSize: 16, color: 'error.main', mt: 0.25 }} />
              : <WarningIcon sx={{ fontSize: 16, color: 'warning.main', mt: 0.25 }} />
            }
            <Box>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{issue.message}</Typography>
              {issue.nodeId && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                  {issue.nodeId}{issue.field ? `.${issue.field}` : ''}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
