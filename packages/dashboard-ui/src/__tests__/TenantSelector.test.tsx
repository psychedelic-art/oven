import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TenantContextProvider } from '../tenant/TenantContextProvider';
import { TenantSelector } from '../tenant/TenantSelector';
import type { DataProvider, Permissions } from '../tenant/types';

const TENANTS = [
  { id: 1, name: 'Clinic A', slug: 'clinic-a' },
  { id: 2, name: 'Clinic B', slug: 'clinic-b' },
];

function mockDataProvider(): DataProvider {
  return {
    getList: vi.fn().mockResolvedValue({ data: TENANTS, total: 2 }),
  };
}

function mockPermissions(hasTenantsList = true): Permissions {
  return {
    has: (p: string) => p === 'tenants.list' && hasTenantsList,
  };
}

function renderWithProvider(
  ui: React.ReactElement,
  opts?: { hasTenantsList?: boolean; initialTenantId?: number | null },
) {
  const dp = mockDataProvider();
  return {
    dp,
    ...render(
      <TenantContextProvider
        dataProvider={dp}
        permissions={mockPermissions(opts?.hasTenantsList ?? true)}
        initialTenantId={opts?.initialTenantId}
      >
        {ui}
      </TenantContextProvider>,
    ),
  };
}

describe('TenantSelector', () => {
  it('renders an Autocomplete with the default label', () => {
    renderWithProvider(<TenantSelector />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByLabelText('Tenant')).toBeInTheDocument();
  });

  it('renders with a custom label', () => {
    renderWithProvider(<TenantSelector label="Organization" />);
    expect(screen.getByLabelText('Organization')).toBeInTheDocument();
  });

  it('shows "All tenants" as default value when allowAllOption is true', () => {
    renderWithProvider(<TenantSelector />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('All tenants');
  });
});
