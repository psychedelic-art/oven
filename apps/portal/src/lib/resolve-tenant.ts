const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'portal.localhost';
const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Extract tenant slug from hostname.
 *
 * Resolution order:
 * 1. Subdomain — e.g. `clinica-xyz.portal.myapp.com` -> `clinica-xyz`
 * 2. Custom domain — look up in API tenant-domains table
 * 3. Localhost — read `?tenant=` query param or `x-tenant-slug` header
 *
 * Returns `null` when no tenant can be resolved.
 */
export async function resolveTenant(
  hostname: string,
  searchParams?: URLSearchParams,
  headers?: Headers,
): Promise<string | null> {
  // Strip port from hostname (e.g. "clinica-xyz.localhost:3001" -> "clinica-xyz.localhost")
  const host = hostname.split(':')[0];

  // 1. Subdomain resolution
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.replace(`.${ROOT_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www') {
      return subdomain.split('.')[0];
    }
  }

  // 2. .localhost subdomain for dev
  if (host.endsWith('.localhost') && !host.includes(ROOT_DOMAIN)) {
    const subdomain = host.replace('.localhost', '');
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      return subdomain;
    }
  }

  // 3. Custom domain resolution
  if (!host.includes('localhost') && host !== ROOT_DOMAIN) {
    try {
      const res = await fetch(
        `${API_URL}/api/tenant-domains/resolve?domain=${encodeURIComponent(hostname)}`,
        { next: { revalidate: 300 } } as RequestInit,
      );
      if (res.ok) {
        const data = await res.json();
        return data.tenantSlug ?? null;
      }
    } catch {
      // Domain resolution failed — fall through
    }
  }

  // 4. Localhost fallback — query param or header
  if (hostname.includes('localhost')) {
    const fromParam = searchParams?.get('tenant') ?? null;
    if (fromParam) return fromParam;

    const fromHeader = headers?.get('x-tenant-slug') ?? null;
    if (fromHeader) return fromHeader;
  }

  return null;
}

export { ROOT_DOMAIN, API_URL };
