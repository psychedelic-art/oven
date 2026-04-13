import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../../chrome/PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Agents" />);
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Agents" subtitle="Manage agent configurations" />);
    expect(screen.getByText('Manage agent configurations')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="Agents" description="Configure and test your agents" />);
    expect(screen.getByText('Configure and test your agents')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(<PageHeader title="Agents" action={<button>Create</button>} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('does not render subtitle or description when not provided', () => {
    const { container } = render(<PageHeader title="Agents" />);
    expect(container.querySelectorAll('.MuiTypography-root')).toHaveLength(1);
  });
});
