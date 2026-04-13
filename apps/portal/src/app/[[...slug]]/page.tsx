import { headers } from 'next/headers';
import { normalizePageSlug } from '@oven/module-ui-flows/slug-utils';
import { fetchPortal, fetchPortalPage } from '@/lib/portal-fetcher';
import { PageRenderer } from '@/components/PageRenderer';
import { cn } from '@oven/oven-ui';

export default async function PortalCatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') || '';

  // Determine the page slug
  let pageSlug: string;
  if (!slug || slug.length === 0) {
    const portal = await fetchPortal(tenantSlug);
    if (!portal) {
      return (
        <div className={cn('portal-error')}>
          <h2>No Pages</h2>
          <p>This portal has no pages configured yet.</p>
        </div>
      );
    }

    const home = resolveHomePage(portal);
    if (home === null) {
      return (
        <div className={cn('portal-error')}>
          <h2>No Pages</h2>
          <p>This portal has no pages configured yet.</p>
        </div>
      );
    }
    pageSlug = normalizePageSlug(home);
  } else {
    pageSlug = normalizePageSlug(slug.join('/'));
  }

  const data = await fetchPortalPage(tenantSlug, pageSlug);

  if (!data) {
    return (
      <div className={cn('portal-error')}>
        <h2>Page Not Found</h2>
        <p>The page &quot;/{pageSlug}&quot; does not exist in this portal.</p>
      </div>
    );
  }

  return <PageRenderer page={data.page} tenantSlug={tenantSlug} />;
}

function resolveHomePage(portal: { definition: { settings: { homePage?: string }; navigation: { items: Array<{ pageId: string }> }; pages: Array<{ id: number; slug: string }> } }): string | null {
  const { definition } = portal;
  const homePage = definition?.settings?.homePage;
  if (homePage !== undefined && homePage !== null) {
    return normalizePageSlug(homePage);
  }

  const navItems = definition?.navigation?.items || [];
  const pages = definition?.pages || [];

  if (navItems.length > 0) {
    const firstPage = pages.find((p) => String(p.id) === navItems[0].pageId);
    if (firstPage) return normalizePageSlug(firstPage.slug);
    return null;
  }

  if (pages.length > 0) return normalizePageSlug(pages[0].slug);
  return null;
}
