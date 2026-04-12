'use client';

import { Component } from 'react';
import { Alert, Button, Box, Typography } from '@mui/material';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for the AI Playground. Catches render-time errors
 * and displays a retry CTA instead of a blank screen.
 *
 * F-01-09 (oven-bug-sprint sprint-01): console.error in all
 * environments for observability.
 */
export class PlaygroundErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AIPlayground error boundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2, justifyContent: 'center' }}>
            Something went wrong in the AI Playground.
          </Alert>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Typography>
          <Button variant="contained" onClick={this.handleRetry}>
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
