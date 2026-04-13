import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/resolve-tenant';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const tenantSlug = await resolveTenant(
    hostname,
    req.nextUrl.searchParams,
    req.headers,
  );

  if (!tenantSlug) {
    return NextResponse.rewrite(new URL('/not-found', req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
