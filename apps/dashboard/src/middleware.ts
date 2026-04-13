import { NextResponse } from 'next/server';

/**
 * Dashboard middleware.
 *
 * Portal subdomain routing has moved to `apps/portal` (standalone Next.js app).
 * The dashboard now serves only the admin interface and API routes.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
