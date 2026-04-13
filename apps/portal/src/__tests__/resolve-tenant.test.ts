import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTenant } from '../lib/resolve-tenant';

// Mock fetch for custom domain resolution
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

beforeEach(() => {
  fetchSpy.mockReset();
});

describe('resolveTenant', () => {
  describe('subdomain resolution', () => {
    it('extracts tenant from ROOT_DOMAIN subdomain', async () => {
      const result = await resolveTenant('clinica-xyz.portal.localhost');
      expect(result).toBe('clinica-xyz');
    });

    it('returns null for www subdomain', async () => {
      const result = await resolveTenant('www.portal.localhost');
      expect(result).toBeNull();
    });

    it('returns null for bare ROOT_DOMAIN', async () => {
      const result = await resolveTenant('portal.localhost');
      expect(result).toBeNull();
    });

    it('takes only the first subdomain segment for nested subdomains', async () => {
      const result = await resolveTenant('a.b.portal.localhost');
      expect(result).toBe('a');
    });
  });

  describe('.localhost subdomain resolution (dev)', () => {
    it('extracts tenant from .localhost subdomain', async () => {
      const result = await resolveTenant('clinica-xyz.localhost');
      expect(result).toBe('clinica-xyz');
    });

    it('strips port from .localhost hostname', async () => {
      const result = await resolveTenant('clinica-xyz.localhost:3001');
      expect(result).toBe('clinica-xyz');
    });

    it('returns null for bare localhost', async () => {
      const result = await resolveTenant('localhost');
      expect(result).toBeNull();
    });

    it('returns null for www.localhost', async () => {
      const result = await resolveTenant('www.localhost');
      expect(result).toBeNull();
    });
  });

  describe('custom domain resolution', () => {
    it('calls the API for unknown non-localhost hostnames', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tenantSlug: 'my-clinic' }),
      });

      const result = await resolveTenant('www.clinicaxyz.com');
      expect(result).toBe('my-clinic');
      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy.mock.calls[0][0]).toContain(
        '/api/tenant-domains/resolve?domain=www.clinicaxyz.com',
      );
    });

    it('returns null when API returns non-ok', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false });

      const result = await resolveTenant('www.unknown-domain.com');
      expect(result).toBeNull();
    });

    it('returns null when API fetch throws', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const result = await resolveTenant('www.broken-domain.com');
      expect(result).toBeNull();
    });
  });

  describe('localhost fallback (query param / header)', () => {
    it('reads tenant from query param on localhost', async () => {
      const params = new URLSearchParams('tenant=demo-clinic');
      const result = await resolveTenant('localhost:3001', params);
      expect(result).toBe('demo-clinic');
    });

    it('reads tenant from x-tenant-slug header on localhost', async () => {
      const headers = new Headers({ 'x-tenant-slug': 'header-clinic' });
      const result = await resolveTenant('localhost:3001', new URLSearchParams(), headers);
      expect(result).toBe('header-clinic');
    });

    it('prefers query param over header', async () => {
      const params = new URLSearchParams('tenant=param-clinic');
      const headers = new Headers({ 'x-tenant-slug': 'header-clinic' });
      const result = await resolveTenant('localhost:3001', params, headers);
      expect(result).toBe('param-clinic');
    });

    it('returns null on localhost with no param or header', async () => {
      const result = await resolveTenant('localhost:3001', new URLSearchParams());
      expect(result).toBeNull();
    });
  });

  describe('no resolution possible', () => {
    it('returns null for empty hostname', async () => {
      const result = await resolveTenant('');
      expect(result).toBeNull();
    });
  });
});
