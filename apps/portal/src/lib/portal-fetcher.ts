import type { PortalData, PortalPageData, ThemeConfig } from './types';
import { API_URL } from './resolve-tenant';
import { pageSlugToUrlSegment } from '@oven/module-ui-flows/slug-utils';

const REVALIDATE = Number(process.env.REVALIDATE_SECONDS) || 60;

export async function fetchPortal(tenantSlug: string): Promise<PortalData | null> {
  try {
    const res = await fetch(`${API_URL}/api/portal/${tenantSlug}`, {
      next: { revalidate: REVALIDATE },
    } as RequestInit);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPortalTheme(tenantSlug: string): Promise<ThemeConfig | null> {
  const portal = await fetchPortal(tenantSlug);
  return portal?.theme ?? null;
}

export async function fetchPortalPage(
  tenantSlug: string,
  pageSlug: string,
): Promise<PortalPageData | null> {
  try {
    const urlSegment = pageSlugToUrlSegment(pageSlug);
    const res = await fetch(
      `${API_URL}/api/portal/${tenantSlug}/pages/${urlSegment}`,
      { next: { revalidate: REVALIDATE } } as RequestInit,
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
