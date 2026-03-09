import Script from 'next/script';
import './portal.css';

interface PortalData {
  definition: {
    pages: Array<{
      id: string;
      slug: string;
      title: string;
      type: string;
    }>;
    navigation: {
      type: 'sidebar' | 'topbar' | 'tabs';
      items: Array<{ pageId: string; label: string; icon?: string }>;
    };
    settings: {
      homePage?: string;
      favicon?: string;
      title?: string;
    };
  };
  theme: {
    primaryColor: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    customCss?: string;
    borderRadius?: number;
  };
  domain: Record<string, unknown> | null;
  tenantName: string;
}

async function getPortalData(tenantSlug: string): Promise<PortalData | null> {
  // Build the API URL — works for both server-side fetching and middleware-rewritten paths
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/portal/${tenantSlug}`, {
    next: { revalidate: 30 }, // Cache for 30s
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const data = await getPortalData(tenantSlug);

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#555' }}>Portal Not Found</h1>
        <p style={{ color: '#999' }}>
          No published portal found for &quot;{tenantSlug}&quot;.
        </p>
      </div>
    );
  }

  const { theme, definition } = data;
  const portalTitle = definition?.settings?.title || data.tenantName || tenantSlug;

  // Build CSS custom properties from theme
  const cssVars = {
    '--portal-primary': theme?.primaryColor || '#1976d2',
    '--portal-secondary': theme?.secondaryColor || '#dc004e',
    '--portal-bg': theme?.backgroundColor || '#ffffff',
    '--portal-font': theme?.fontFamily || "'Inter', sans-serif",
    '--portal-radius': `${theme?.borderRadius ?? 8}px`,
  } as React.CSSProperties;

  const navType = definition?.navigation?.type || 'sidebar';
  const navItems = definition?.navigation?.items || [];
  const pages = definition?.pages || [];

  // Resolve nav items to page slugs
  const resolvedNavItems = navItems
    .map((item) => {
      const page = pages.find((p) => p.id === item.pageId);
      return page ? { label: item.label, slug: page.slug } : null;
    })
    .filter(Boolean) as Array<{ label: string; slug: string }>;

  const rootClass =
    navType === 'topbar'
      ? 'portal-root portal-root-topbar'
      : navType === 'tabs'
        ? 'portal-root portal-root-tabs'
        : 'portal-root';

  return (
    <div className={rootClass} style={cssVars}>
      {/* Tailwind CDN for dynamic content (form HTML from DB with Tailwind classes) */}
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

      {/* Inject custom CSS if any */}
      {theme?.customCss && <style dangerouslySetInnerHTML={{ __html: theme.customCss }} />}

      {/* Navigation */}
      {navType === 'sidebar' && (
        <nav className="portal-nav-sidebar">
          {theme?.logoUrl ? (
            <div className="nav-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={theme.logoUrl} alt={portalTitle} />
            </div>
          ) : (
            <div className="nav-title">{portalTitle}</div>
          )}
          <ul className="nav-items">
            {resolvedNavItems.map((item) => (
              <li key={item.slug} className="nav-item">
                <a href={`/${item.slug}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {navType === 'topbar' && (
        <nav className="portal-nav-topbar">
          {theme?.logoUrl ? (
            <div className="nav-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={theme.logoUrl} alt={portalTitle} />
            </div>
          ) : (
            <div className="nav-title">{portalTitle}</div>
          )}
          <ul className="nav-items">
            {resolvedNavItems.map((item) => (
              <li key={item.slug} className="nav-item">
                <a href={`/${item.slug}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {navType === 'tabs' && (
        <nav className="portal-nav-tabs">
          <ul className="nav-items">
            {resolvedNavItems.map((item) => (
              <li key={item.slug} className="nav-item">
                <a href={`/${item.slug}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Page content */}
      <div className="portal-content">{children}</div>
    </div>
  );
}
