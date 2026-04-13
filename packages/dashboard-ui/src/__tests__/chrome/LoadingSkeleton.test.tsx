import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../../chrome/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders list variant by default', () => {
    const { container } = render(<LoadingSkeleton />);
    // Should have skeleton elements
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders the specified number of rows', () => {
    const { container } = render(<LoadingSkeleton variant="form" rows={3} />);
    // Form variant: each row has a label skeleton + input skeleton = 2 per row
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBe(6); // 3 rows * 2 skeletons each
  });

  it('renders detail variant', () => {
    const { container } = render(<LoadingSkeleton variant="detail" />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(3);
  });
});
