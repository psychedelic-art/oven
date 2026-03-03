# apps/portal — Tenant Portal App

> **Location**: `apps/portal/`
> **Framework**: Next.js 15 (App Router)
> **Purpose**: Serves dynamic tenant-facing portals on custom subdomains and domains
> **Dependencies**: `@oven/module-ui-flows` (API), `@oven/agent-ui` (chat widget), `@oven/form-editor` (form rendering)

---

## 1. Overview

`apps/portal` is a **standalone Next.js 15 application** in the Turbo monorepo that renders tenant portals. Each tenant gets a branded website on their own subdomain (e.g., `clinica-xyz.portal.myapp.com`) or custom domain (e.g., `www.clinicaxyz.com`).

The portal app does not contain any business logic — it is a **rendering layer** that:
1. Resolves the incoming hostname to a tenant via middleware
2. Fetches the tenant's published UI Flow definition from the API
3. Renders the appropriate page component based on page type
4. Applies the tenant's theme configuration as CSS variables

---

## 2. Architecture

```
apps/portal/
  package.json
  next.config.ts
  vercel.json
  tsconfig.json
  middleware.ts                          ← Subdomain/domain → tenant resolution
  src/
    app/
      layout.tsx                        ← Root layout + tenant theme provider
      page.tsx                          ← Root page → redirect to default page
      [...slug]/
        page.tsx                        ← Dynamic catch-all page renderer
      not-found.tsx                     ← Custom 404 with tenant branding
    lib/
      tenant-resolver.ts                ← hostname → tenantSlug resolution
      portal-fetcher.ts                 ← API calls to module-ui-flows
      theme-provider.tsx                ← CSS variable injection from themeConfig
      types.ts                          ← PortalDefinition, PageDefinition, ThemeConfig
    components/
      portal-layout.tsx                 ← Navigation + content + footer wrapper
      page-renderer.tsx                 ← Dispatches to type-specific page component
      pages/
        LandingPage.tsx                 ← Hero + CTA rendering
        FormPage.tsx                    ← Fetches + renders GrapeJS form output
        FaqPage.tsx                     ← Fetches KB entries → accordion with search
        ChatPage.tsx                    ← Embeds @oven/agent-ui chat widget
        CustomPage.tsx                  ← Generic form-referenced page
      navigation/
        TopBar.tsx                      ← Horizontal navigation bar with logo
        SideNav.tsx                     ← Optional sidebar navigation
        Footer.tsx                      ← Footer links and copyright
      ui/
        ThemeWrapper.tsx                ← Applies CSS variables to children
        LoadingState.tsx                ← Skeleton loading for pages
        ErrorBoundary.tsx               ← Graceful error handling
```

---

## 3. Middleware — Subdomain Routing

The middleware intercepts every request, extracts the tenant slug from the hostname, and passes it downstream via request headers.

```typescript
// apps/portal/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'portal.myapp.com';
const API_URL = process.env.API_URL || 'http://localhost:3000';

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  let tenantSlug: string | null = null;

  // ── 1. Subdomain resolution ──────────────────────────────────
  // e.g., clinica-xyz.portal.myapp.com → tenantSlug = "clinica-xyz"
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www') {
      tenantSlug = subdomain.split('.')[0];
    }
  }

  // ── 2. Custom domain resolution ──────────────────────────────
  // e.g., www.clinicaxyz.com → look up in tenant_domains table
  if (!tenantSlug && hostname !== ROOT_DOMAIN && !hostname.includes('localhost')) {
    try {
      const res = await fetch(
        `${API_URL}/api/tenant-domains/resolve?domain=${encodeURIComponent(hostname)}`,
        { next: { revalidate: 300 } }
      );
      if (res.ok) {
        const data = await res.json();
        tenantSlug = data.tenantSlug;
      }
    } catch {
      // Domain resolution failed — fall through to 404
    }
  }

  // ── 3. Localhost development ─────────────────────────────────
  if (!tenantSlug && hostname.includes('localhost')) {
    tenantSlug = req.nextUrl.searchParams.get('tenant')
      || req.headers.get('x-tenant-slug')
      || null;
  }

  // ── 4. No tenant found → 404 ────────────────────────────────
  if (!tenantSlug) {
    return NextResponse.rewrite(new URL('/not-found', req.url));
  }

  // ── 5. Pass tenant context downstream ────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
```

---

## 4. Dynamic Page Rendering

### Root Layout — `layout.tsx`

```typescript
import { headers } from 'next/headers';
import { fetchPortalTheme } from '@/lib/portal-fetcher';
import { ThemeWrapper } from '@/components/ui/ThemeWrapper';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenantSlug = headers().get('x-tenant-slug') || '';
  const theme = await fetchPortalTheme(tenantSlug);

  return (
    <html lang="es">
      <head>
        {theme?.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
      </head>
      <body>
        <ThemeWrapper theme={theme}>
          {children}
        </ThemeWrapper>
      </body>
    </html>
  );
}
```

### Catch-All Page — `[...slug]/page.tsx`

```typescript
import { headers } from 'next/headers';
import { fetchPortal } from '@/lib/portal-fetcher';
import { PortalLayout } from '@/components/portal-layout';
import { PageRenderer } from '@/components/page-renderer';
import { notFound } from 'next/navigation';

export default async function PortalPage({ params }: { params: { slug: string[] } }) {
  const tenantSlug = headers().get('x-tenant-slug') || '';
  const pageSlug = params.slug?.join('/') || '';

  const portal = await fetchPortal(tenantSlug);
  if (!portal) return notFound();

  // Check for redirects
  const redirect = portal.definition.routing?.redirects?.find(
    (r: any) => r.from === `/${pageSlug}`
  );
  if (redirect) {
    return Response.redirect(new URL(redirect.to, `https://${tenantSlug}.${process.env.ROOT_DOMAIN}`));
  }

  // Find the page
  const page = portal.definition.pages?.find((p: any) => p.slug === pageSlug);
  if (!page) {
    const fallbackSlug = portal.definition.routing?.notFoundPage;
    if (fallbackSlug && fallbackSlug !== pageSlug) {
      return Response.redirect(new URL(`/${fallbackSlug}`, `https://${tenantSlug}.${process.env.ROOT_DOMAIN}`));
    }
    return notFound();
  }

  return (
    <PortalLayout
      navigation={portal.definition.navigation}
      footer={portal.definition.footer}
      tenantName={portal.tenantName}
      logoUrl={portal.theme?.logoUrl}
      currentPageSlug={pageSlug}
    >
      <PageRenderer page={page} tenantSlug={tenantSlug} />
    </PortalLayout>
  );
}
```

### Page Renderer — Dispatches by Type

```typescript
import { LandingPage } from './pages/LandingPage';
import { FormPage } from './pages/FormPage';
import { FaqPage } from './pages/FaqPage';
import { ChatPage } from './pages/ChatPage';
import { CustomPage } from './pages/CustomPage';

interface PageRendererProps {
  page: {
    slug: string;
    title: string;
    type: string;
    formRef: string | null;
    config: Record<string, any>;
  };
  tenantSlug: string;
}

export function PageRenderer({ page, tenantSlug }: PageRendererProps) {
  switch (page.type) {
    case 'landing':
      return <LandingPage page={page} tenantSlug={tenantSlug} />;
    case 'form':
      return <FormPage page={page} tenantSlug={tenantSlug} />;
    case 'faq':
      return <FaqPage page={page} tenantSlug={tenantSlug} />;
    case 'chat':
      return <ChatPage page={page} tenantSlug={tenantSlug} />;
    case 'custom':
      return <CustomPage page={page} tenantSlug={tenantSlug} />;
    default:
      return <div>Unknown page type: {page.type}</div>;
  }
}
```

---

## 5. Vercel Domain Setup

### Step 1 — Wildcard Domain (Subdomains)

**Prerequisites**:
- Domain DNS must be managed by Vercel (nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)

**Setup**:
1. Add the `apps/portal` project to Vercel
2. In Project Settings → Domains, add:
   - `portal.myapp.com` (apex — serves the base domain)
   - `*.portal.myapp.com` (wildcard — catches all subdomains)
3. Vercel auto-issues SSL certificates for each subdomain on first request
4. No additional DNS configuration needed — wildcard catches everything

### Step 2 — Custom Domains per Tenant

When a tenant wants their own domain (e.g., `www.clinicaxyz.com`):

**A. Tenant registers domain in admin dashboard**:
1. Admin goes to Tenant Settings → Domains
2. Enters `www.clinicaxyz.com`
3. System generates a TXT verification record

**B. System adds domain to Vercel via API**:
```typescript
import { VercelCore as Vercel } from '@vercel/sdk/core.js';
import { projectsAddProjectDomain } from '@vercel/sdk/funcs/projectsAddProjectDomain.js';

export async function addCustomDomain(domain: string) {
  const vercel = new Vercel({ bearerToken: process.env.VERCEL_TOKEN });
  const result = await projectsAddProjectDomain(vercel, {
    idOrName: process.env.VERCEL_PORTAL_PROJECT_ID!,
    teamId: process.env.VERCEL_TEAM_ID,
    requestBody: { name: domain },
  });
  return result;
}
```

**C. Tenant adds DNS records**:
- **TXT record**: `_vercel.www.clinicaxyz.com` → `vc-domain-verify=xxxxx`
- **CNAME record**: `www.clinicaxyz.com` → `cname.vercel-dns.com`

**D. System verifies domain**:
```typescript
import { projectsVerifyProjectDomain } from '@vercel/sdk/funcs/projectsVerifyProjectDomain.js';

const result = await projectsVerifyProjectDomain(vercel, {
  idOrName: process.env.VERCEL_PORTAL_PROJECT_ID!,
  teamId: process.env.VERCEL_TEAM_ID,
  domain: 'www.clinicaxyz.com',
});
```

### Step 3 — Domain Resolution Table

Added to `module-tenants` schema:

```typescript
export const tenantDomains = pgTable('tenant_domains', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  domain: varchar('domain', { length: 255 }).notNull().unique(),
  domainType: varchar('domain_type', { length: 20 }).notNull(), // subdomain | custom
  verified: boolean('verified').notNull().default(false),
  sslStatus: varchar('ssl_status', { length: 20 }).notNull().default('pending'),
  isPrimary: boolean('is_primary').notNull().default(false),
  vercelConfig: jsonb('vercel_config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('td_tenant_id_idx').on(table.tenantId),
]);
```

---

## 6. Theme System

### CSS Variable Injection

```typescript
// apps/portal/src/components/ui/ThemeWrapper.tsx
import type { ThemeConfig } from '@/lib/types';

export function ThemeWrapper({ theme, children }: { theme: ThemeConfig | null; children: React.ReactNode }) {
  const cssVars = theme ? {
    '--portal-primary': theme.primaryColor || '#1976D2',
    '--portal-secondary': theme.secondaryColor || '#FF9800',
    '--portal-bg': theme.backgroundColor || '#FFFFFF',
    '--portal-surface': theme.surfaceColor || '#F5F5F5',
    '--portal-text': theme.textColor || '#333333',
    '--portal-font': theme.fontFamily || 'Inter, sans-serif',
    '--portal-heading-font': theme.headingFontFamily || theme.fontFamily || 'Inter, sans-serif',
    '--portal-radius': theme.borderRadius || '8px',
    '--portal-max-width': theme.maxContentWidth || '1200px',
  } as React.CSSProperties : {};

  return (
    <div style={cssVars} className="portal-root">
      {children}
      {theme?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />
      )}
    </div>
  );
}
```

### Base Styles

```css
/* apps/portal/src/app/globals.css */
.portal-root {
  font-family: var(--portal-font);
  color: var(--portal-text);
  background-color: var(--portal-bg);
  min-height: 100vh;
}

.portal-root h1, .portal-root h2, .portal-root h3 {
  font-family: var(--portal-heading-font);
}

.portal-nav { background-color: var(--portal-primary); color: white; }
.portal-btn-primary { background-color: var(--portal-primary); border-radius: var(--portal-radius); }
.portal-btn-secondary { background-color: var(--portal-secondary); border-radius: var(--portal-radius); }
.portal-content { max-width: var(--portal-max-width); margin: 0 auto; padding: 0 1rem; }
.portal-card { background-color: var(--portal-surface); border-radius: var(--portal-radius); }
```

---

## 7. Local Development

```bash
# Start the dashboard API (serves module-ui-flows endpoints)
pnpm --filter dashboard dev

# Start the portal app
pnpm --filter portal dev
```

### Testing with Subdomains Locally

Since `localhost` doesn't support subdomains, use query parameters:

```
http://localhost:3001?tenant=clinica-xyz           → resolves to clinica-xyz tenant
http://localhost:3001/faq?tenant=clinica-xyz       → FAQ page for clinica-xyz
```

Or use `/etc/hosts`:
```
127.0.0.1 clinica-xyz.portal.localhost
```
With `ROOT_DOMAIN=portal.localhost` in `.env.local`.

---

## 8. Environment Variables

```env
# Required
ROOT_DOMAIN=portal.myapp.com
API_URL=https://dashboard.myapp.com

# Vercel Domain Management (for custom domains)
VERCEL_TOKEN=xxxxx
VERCEL_TEAM_ID=team_xxxxx
VERCEL_PORTAL_PROJECT_ID=prj_xxxxx

# Optional
REVALIDATE_SECONDS=60
ANALYTICS_ENABLED=true
```

---

## 9. Caching Strategy

### ISR (Incremental Static Regeneration)

Portal pages are mostly static. Use ISR with revalidation:

```typescript
export async function fetchPortal(tenantSlug: string) {
  const res = await fetch(`${API_URL}/api/portal/${tenantSlug}`, {
    next: { revalidate: Number(process.env.REVALIDATE_SECONDS) || 60 },
  });
  if (!res.ok) return null;
  return res.json();
}
```

### On-Demand Revalidation

When an admin publishes a UI Flow, trigger revalidation:
```typescript
await fetch(`${PORTAL_URL}/api/revalidate?tag=${tenantSlug}`, {
  method: 'POST',
  headers: { 'x-revalidation-key': process.env.REVALIDATION_SECRET },
});
```

---

## 10. Deployment

### Vercel Project Setup

1. Create a new Vercel project linked to the monorepo
2. Set **Root Directory** to `apps/portal`
3. Set **Build Command** to `cd ../.. && pnpm turbo build --filter=portal`
4. Add domains: `portal.myapp.com` + `*.portal.myapp.com`

### `apps/portal/vercel.json`

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm turbo build --filter=portal"
}
```

---

## 11. Security Considerations

- **Public API endpoints**: Portal resolution endpoints (`/api/portal/*`) are marked `isPublic: true`. No auth required.
- **Analytics endpoint**: Rate-limited to prevent abuse.
- **Custom CSS injection**: Disabled by default (`ENABLE_CUSTOM_CSS` config). When enabled, CSS is sanitized.
- **Domain squatting**: Custom domains require TXT record verification before activation.
- **CORS**: Portal app only fetches from `API_URL` — no cross-origin concerns for SSR.
