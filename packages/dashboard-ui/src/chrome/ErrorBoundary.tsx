import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI. If omitted, uses the built-in error card with retry. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for dashboard pages. Catches render errors and shows
 * a recoverable error state with a "Try again" button.
 *
 * Must be a class component for componentDidCatch.
 * Follows CLAUDE.md: error handling at system boundaries only.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main', mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={this.handleRetry}
            sx={{ textTransform: 'none' }}
          >
            Try again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
