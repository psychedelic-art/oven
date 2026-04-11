import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from '../shared/ChatHeader';

describe('ChatHeader', () => {
  it('renders the title', () => {
    render(<ChatHeader title="My Agent" />);
    expect(screen.getByText('My Agent')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<ChatHeader title="My Agent" subtitle="agent · my-agent" />);
    expect(screen.getByText('agent · my-agent')).toBeInTheDocument();
  });

  it('renders the streaming indicator when status is streaming', () => {
    render(<ChatHeader title="x" status="streaming" />);
    expect(screen.getByText(/Streaming/i)).toBeInTheDocument();
  });

  it('renders the error indicator when status is error', () => {
    render(<ChatHeader title="x" status="error" />);
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
  });

  it('does not render any status indicator when idle', () => {
    render(<ChatHeader title="x" status="idle" />);
    expect(screen.queryByText(/Streaming/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
  });

  it('renders the badge slot', () => {
    render(<ChatHeader title="x" badge={<span data-testid="badge">AGENT</span>} />);
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('renders the rightSlot', () => {
    render(<ChatHeader title="x" rightSlot={<button>Toggle</button>} />);
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });
});
