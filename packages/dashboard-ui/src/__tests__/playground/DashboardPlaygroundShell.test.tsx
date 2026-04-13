import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock UnifiedAIPlayground — we don't render the real Tailwind playground
// inside the jsdom test; we just verify the shell passes the right props.
vi.mock('@oven/agent-ui', () => ({
  UnifiedAIPlayground: (props: Record<string, unknown>) => (
    <div data-testid="unified-playground" data-props={JSON.stringify(props)} />
  ),
}));

// Mock the tenant context (not available outside TenantContextProvider in tests)
vi.mock('../../tenant/useTenantContext', () => ({
  useTenantContext: () => { throw new Error('No provider'); },
}));

vi.mock('../../tenant/TenantSelector', () => ({
  TenantSelector: () => <div data-testid="tenant-selector" />,
}));

import { DashboardPlaygroundShell } from '../../playground/DashboardPlaygroundShell';

describe('DashboardPlaygroundShell', () => {
  it('renders the header with the given title', () => {
    render(<DashboardPlaygroundShell title="Test Playground" />);
    expect(screen.getByText('Test Playground')).toBeInTheDocument();
  });

  it('renders the default title when none provided', () => {
    render(<DashboardPlaygroundShell />);
    expect(screen.getByText('AI Playground')).toBeInTheDocument();
  });

  it('renders a back button when showBackButton is true', () => {
    render(<DashboardPlaygroundShell showBackButton onBack={vi.fn()} />);
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('does not render a back button when showBackButton is false', () => {
    render(<DashboardPlaygroundShell />);
    expect(screen.queryByLabelText('Back')).not.toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<DashboardPlaygroundShell showBackButton onBack={onBack} />);
    await user.click(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the tenant selector when showTenantSelector is true', () => {
    render(<DashboardPlaygroundShell showTenantSelector />);
    expect(screen.getByTestId('tenant-selector')).toBeInTheDocument();
  });

  it('does not render the tenant selector by default', () => {
    render(<DashboardPlaygroundShell />);
    expect(screen.queryByTestId('tenant-selector')).not.toBeInTheDocument();
  });

  it('mounts UnifiedAIPlayground with feature props forwarded', () => {
    render(
      <DashboardPlaygroundShell
        showSessionSidebar
        showThemeToggle
        showConnectionStatus
        showLayoutToggle
        showExecutionHistory
        initialTheme="dark"
        tenantId={42}
        tenantSlug="clinic-a"
        defaultMode="workflow"
        sessionConfig={{ canCreate: true, canDelete: false, canPin: true, canStop: false }}
      />,
    );

    const playground = screen.getByTestId('unified-playground');
    const props = JSON.parse(playground.getAttribute('data-props') ?? '{}');

    expect(props.showSessionSidebar).toBe(true);
    expect(props.showThemeToggle).toBe(true);
    expect(props.showConnectionStatus).toBe(true);
    expect(props.showLayoutToggle).toBe(true);
    expect(props.showExecutionHistory).toBe(true);
    expect(props.initialTheme).toBe('dark');
    expect(props.tenantId).toBe(42);
    expect(props.tenantSlug).toBe('clinic-a');
    expect(props.defaultMode).toBe('workflow');
    expect(props.sessionConfig).toEqual({
      canCreate: true,
      canDelete: false,
      canPin: true,
      canStop: false,
    });
  });

  it('defaults to apiBaseUrl="" and tenantSlug="default"', () => {
    render(<DashboardPlaygroundShell />);
    const playground = screen.getByTestId('unified-playground');
    const props = JSON.parse(playground.getAttribute('data-props') ?? '{}');
    expect(props.apiBaseUrl).toBe('');
    expect(props.tenantSlug).toBe('default');
  });
});
