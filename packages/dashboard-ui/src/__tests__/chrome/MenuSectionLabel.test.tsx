import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuSectionLabel } from '../../chrome/MenuSectionLabel';

describe('MenuSectionLabel', () => {
  it('renders the label text', () => {
    render(<MenuSectionLabel label="AI Services" />);
    expect(screen.getByText('AI Services')).toBeInTheDocument();
  });

  it('renders a divider by default', () => {
    const { container } = render(<MenuSectionLabel label="Test" />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('hides the divider when showDivider is false', () => {
    const { container } = render(<MenuSectionLabel label="Test" showDivider={false} />);
    expect(container.querySelector('hr')).not.toBeInTheDocument();
  });
});
