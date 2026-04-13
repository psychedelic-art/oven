import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock resolveTenant before importing middleware
const mockResolveTenant = vi.fn<(...args: unknown[]) => Promise<string | null>>();
vi.mock('@/lib/resolve-tenant', () => ({
  resolveTenant: (...args: unknown[]) => mockResolveTenant(...args),
}));

// Minimal stubs for Next.js middleware types
class MockNextURL {
  pathname: string;
  searchParams: URLSearchParams;
  constructor(pathname: string, base?: string) {
    this.pathname = pathname;
    this.searchParams = new URLSearchParams();
  }
  toString() {
    return `http://localhost${this.pathname}`;
  }
}

class MockNextRequest {
  headers: Headers;
  nextUrl: MockNextURL;
  url: string;

  constructor(hostname: string, pathname = '/') {
    this.headers = new Headers({ host: hostname });
    this.nextUrl = new MockNextURL(pathname);
    this.url = `http://${hostname}${pathname}`;
  }
}

// Mock NextResponse
const mockRewrite = vi.fn().mockReturnValue({ type: 'rewrite' });
const mockNext = vi.fn().mockReturnValue({ type: 'next' });

vi.mock('next/server', () => ({
  NextResponse: {
    rewrite: (...args: unknown[]) => mockRewrite(...args),
    next: (...args: unknown[]) => mockNext(...args),
  },
}));

// Import AFTER mocks are set up
const { default: middleware } = await import('../middleware');

beforeEach(() => {
  mockResolveTenant.mockReset();
  mockRewrite.mockClear();
  mockNext.mockClear();
});

describe('portal middleware', () => {
  it('rewrites to /not-found when no tenant is resolved', async () => {
    mockResolveTenant.mockResolvedValueOnce(null);

    const req = new MockNextRequest('unknown.example.com');
    await middleware(req as any);

    expect(mockRewrite).toHaveBeenCalledOnce();
  });

  it('calls NextResponse.next with x-tenant-slug header when tenant resolves', async () => {
    mockResolveTenant.mockResolvedValueOnce('clinica-xyz');

    const req = new MockNextRequest('clinica-xyz.localhost:3001');
    await middleware(req as any);

    expect(mockNext).toHaveBeenCalledOnce();
    const callArgs = mockNext.mock.calls[0][0];
    const passedHeaders = callArgs.request.headers;
    expect(passedHeaders.get('x-tenant-slug')).toBe('clinica-xyz');
  });

  it('passes hostname, searchParams, and headers to resolveTenant', async () => {
    mockResolveTenant.mockResolvedValueOnce('test');

    const req = new MockNextRequest('test.localhost:3001');
    await middleware(req as any);

    expect(mockResolveTenant).toHaveBeenCalledWith(
      'test.localhost:3001',
      expect.any(MockNextURL.constructor === URLSearchParams ? URLSearchParams : Object),
      expect.any(Headers),
    );
  });

  it('handles subdomain with port correctly', async () => {
    mockResolveTenant.mockResolvedValueOnce('demo');

    const req = new MockNextRequest('demo.localhost:3001', '/faq');
    await middleware(req as any);

    expect(mockResolveTenant).toHaveBeenCalledOnce();
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('handles root path request', async () => {
    mockResolveTenant.mockResolvedValueOnce('clinic');

    const req = new MockNextRequest('clinic.localhost:3001', '/');
    await middleware(req as any);

    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('handles deep path request', async () => {
    mockResolveTenant.mockResolvedValueOnce('clinic');

    const req = new MockNextRequest('clinic.localhost:3001', '/appointments/new');
    await middleware(req as any);

    expect(mockNext).toHaveBeenCalledOnce();
  });
});
