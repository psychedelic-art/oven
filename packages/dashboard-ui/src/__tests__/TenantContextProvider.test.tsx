import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { TenantContextProvider } from '../tenant/TenantContextProvider';
import { useTenantContext } from '../tenant/useTenantContext';
import type { DataProvider, Permissions } from '../tenant/types';

function mockDataProvider(): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
  };
}

function mockPermissions(hasTenantsList = true): Permissions {
  return {
    has: (p: string) => p === 'tenants.list' && hasTenantsList,
  };
}

function TestConsumer() {
  const id = useTenantContext((s) => s.activeTenantId);
  return <div data-testid="tenant-id">{id === null ? 'null' : String(id)}</div>;
}

describe('TenantContextProvider', () => {
  it('renders children', () => {
    render(
      <TenantContextProvider dataProvider={mockDataProvider()} permissions={mockPermissions()}>
        <div data-testid="child">Hello</div>
      </TenantContextProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides store value to useTenantContext', () => {
    render(
      <TenantContextProvider dataProvider={mockDataProvider()} permissions={mockPermissions()}>
        <TestConsumer />
      </TenantContextProvider>,
    );
    expect(screen.getByTestId('tenant-id')).toHaveTextContent('null');
  });

  it('provides initialTenantId when set', () => {
    render(
      <TenantContextProvider
        dataProvider={mockDataProvider()}
        permissions={mockPermissions()}
        initialTenantId={42}
      >
        <TestConsumer />
      </TenantContextProvider>,
    );
    expect(screen.getByTestId('tenant-id')).toHaveTextContent('42');
  });

  it('useTenantContext outside provider throws a descriptive error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useTenantContext must be used within a <TenantContextProvider>',
    );
    spy.mockRestore();
  });

  it('two sibling providers create isolated stores', () => {
    function IdDisplay({ testId }: { testId: string }) {
      const id = useTenantContext((s) => s.activeTenantId);
      return <div data-testid={testId}>{id === null ? 'null' : String(id)}</div>;
    }

    render(
      <>
        <TenantContextProvider
          dataProvider={mockDataProvider()}
          permissions={mockPermissions()}
          initialTenantId={1}
        >
          <IdDisplay testId="a" />
        </TenantContextProvider>
        <TenantContextProvider
          dataProvider={mockDataProvider()}
          permissions={mockPermissions()}
          initialTenantId={2}
        >
          <IdDisplay testId="b" />
        </TenantContextProvider>
      </>,
    );

    expect(screen.getByTestId('a')).toHaveTextContent('1');
    expect(screen.getByTestId('b')).toHaveTextContent('2');
  });
});
