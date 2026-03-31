import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware for subdomain-based portal routing.
 *
 * When a request arrives at `slug.localhost:3000/page-slug`, the middleware
 * rewrites the internal URL to `/portal/[tenantSlug]/page-slug` so that
 * Next.js renders the portal pages while the browser URL stays unchanged.
 *
 * The main dashboard at `localhost:3000` is unaffected — it uses hash routing
 * (`/#/...`) which means requests are always to `/` and middleware passes
 * them through.
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip internal Next.js routes, API routes, and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/__nextjs')
  ) {
    return NextResponse.next();
  }

  // Extract subdomain from hostname
  // Handles: slug.localhost:3000, slug.example.com, slug.example.com:3000
  const host = hostname.split(':')[0]; // Remove port
  let subdomain: string | null = null;

  if (host === 'localhost' || host === '127.0.0.1') {
    // No subdomain for plain localhost
    subdomain = null;
  } else if (host.endsWith('.localhost')) {
    // e.g. clinica.localhost → subdomain = 'clinica'
    subdomain = host.replace('.localhost', '');
  } else {
    // e.g. clinica.example.com → subdomain = 'clinica'
    const parts = host.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
      // Don't treat 'www' as a portal subdomain
      if (subdomain === 'www') subdomain = null;
    }
  }

  // No subdomain → let the request pass through to the normal dashboard
  if (!subdomain) {
    return NextResponse.next();
  }

  // Rewrite to internal portal route
  // e.g. clinica.localhost:3000/auth → /portal/clinica/auth (internal)
  const url = request.nextUrl.clone();
  url.pathname = `/portal/${subdomain}${pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  // Match all paths except static files and API
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
