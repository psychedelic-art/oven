import { headers } from 'next/headers';
import { fetchPortal } from '@/lib/portal-fetcher';
import { cn } from '@oven/oven-ui';
import type { ThemeConfig, NavigationItem } from '@/lib/types';
import './globals.css';

function buildCssVars(theme: ThemeConfig | undefined): React.CSSProperties {
  if (!theme) return {};
  return {
    '--portal-primary': theme.primaryColor || '#1976d2',
    '--portal-secondary': theme.secondaryColor || '#dc004e',
    '--portal-bg': theme.backgroundColor || '#ffffff',
    '--portal-surface': theme.surfaceColor || '#f5f5f5',
    '--portal-text': theme.textColor || '#333333',
    '--portal-font': theme.fontFamily || "'Inter', sans-serif",
    '--portal-heading-font': theme.headingFontFamily || theme.fontFamily || "'Inter', sans-serif",
    '--portal-radius': theme.borderRadius || '8px',
    '--portal-max-width': theme.maxContentWidth || '1200px',
  } as React.CSSProperties;
}

interface ResolvedNavItem {
  label: string;
  slug: string;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') || '';
  const data = await fetchPortal(tenantSlug);

  if (!data) {
    return (
      <html lang="en">
        <body>
          <div className={cn('portal-error')}>
            <h2>Portal Not Found</h2>
            <p>No published portal found for &quot;{tenantSlug}&quot;.</p>
          </div>
        </body>
      </html>
    );
  }

  const { theme, definition } = data;
  const portalTitle = definition?.settings?.title || data.tenantName || tenantSlug;
  const cssVars = buildCssVars(theme);
  const navType = definition?.navigation?.type || 'sidebar';
  const navItems: NavigationItem[] = definition?.navigation?.items || [];
  const pages = definition?.pages || [];

  const resolvedNavItems: ResolvedNavItem[] = navItems
    .map((item) => {
      const page = pages.find((p) => String(p.id) === item.pageId);
      return page ? { label: item.label, slug: page.slug } : null;
    })
    .filter((item): item is ResolvedNavItem => item !== null);

  const rootClass = cn(
    'portal-root',
    navType === 'topbar' && 'portal-root-topbar',
    navType === 'tabs' && 'portal-root-tabs',
  );

  return (
    <html lang="en">
      <head>
        {theme?.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
        <title>{portalTitle}</title>
      </head>
      <body>
        <div className={rootClass} style={cssVars}>
          {theme?.customCss && (
            <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />
          )}

          {navType === 'sidebar' && (
            <SidebarNav
              logoUrl={theme?.logoUrl}
              portalTitle={portalTitle}
              items={resolvedNavItems}
              tenantSlug={tenantSlug}
            />
          )}

          {navType === 'topbar' && (
            <TopbarNav
              logoUrl={theme?.logoUrl}
              portalTitle={portalTitle}
              items={resolvedNavItems}
              tenantSlug={tenantSlug}
            />
          )}

          {navType === 'tabs' && (
            <TabsNav items={resolvedNavItems} tenantSlug={tenantSlug} />
          )}

          <div className={cn('portal-content')}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

function SidebarNav({
  logoUrl,
  portalTitle,
  items,
  tenantSlug,
}: {
  logoUrl?: string;
  portalTitle: string;
  items: ResolvedNavItem[];
  tenantSlug: string;
}) {
  return (
    <nav className={cn('portal-nav-sidebar')}>
      {logoUrl ? (
        <div className={cn('nav-logo')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={portalTitle} />
        </div>
      ) : (
        <div className={cn('nav-title')}>{portalTitle}</div>
      )}
      <NavItems items={items} tenantSlug={tenantSlug} />
    </nav>
  );
}

function TopbarNav({
  logoUrl,
  portalTitle,
  items,
  tenantSlug,
}: {
  logoUrl?: string;
  portalTitle: string;
  items: ResolvedNavItem[];
  tenantSlug: string;
}) {
  return (
    <nav className={cn('portal-nav-topbar')}>
      {logoUrl ? (
        <div className={cn('nav-logo')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={portalTitle} />
        </div>
      ) : (
        <div className={cn('nav-title')}>{portalTitle}</div>
      )}
      <NavItems items={items} tenantSlug={tenantSlug} />
    </nav>
  );
}

function TabsNav({
  items,
  tenantSlug,
}: {
  items: ResolvedNavItem[];
  tenantSlug: string;
}) {
  return (
    <nav className={cn('portal-nav-tabs')}>
      <NavItems items={items} tenantSlug={tenantSlug} />
    </nav>
  );
}

function NavItems({
  items,
  tenantSlug: _tenantSlug,
}: {
  items: ResolvedNavItem[];
  tenantSlug: string;
}) {
  return (
    <ul className={cn('nav-items')}>
      {items.map((item) => (
        <li key={item.slug} className={cn('nav-item')}>
          <a href={`/${item.slug}`}>{item.label}</a>
        </li>
      ))}
    </ul>
  );
}
