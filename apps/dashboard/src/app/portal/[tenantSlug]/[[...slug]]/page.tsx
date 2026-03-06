import LandingRenderer from './_renderers/LandingRenderer';
import FormRenderer from './_renderers/FormRenderer';
import FaqRenderer from './_renderers/FaqRenderer';
import ChatRenderer from './_renderers/ChatRenderer';
import CustomRenderer from './_renderers/CustomRenderer';

interface PortalPageData {
  page: {
    id: number;
    slug: string;
    title: string;
    pageType: string;
    formId: number | null;
    config: Record<string, unknown> | null;
    definition: Record<string, unknown> | null;
  };
  theme: Record<string, unknown>;
  tenantName: string;
}

async function getPageData(
  tenantSlug: string,
  pageSlug: string
): Promise<PortalPageData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(
    `${baseUrl}/api/portal/${tenantSlug}/pages/${pageSlug}`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) return null;
  return res.json();
}

async function getPortalHome(tenantSlug: string): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/portal/${tenantSlug}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const homePage = data?.definition?.settings?.homePage;
  if (homePage) return homePage;

  // Fallback: first navigation item or first page
  const navItems = data?.definition?.navigation?.items || [];
  const pages = data?.definition?.pages || [];
  if (navItems.length > 0) {
    const firstPage = pages.find(
      (p: { id: string }) => p.id === navItems[0].pageId
    );
    return firstPage?.slug || null;
  }
  return pages[0]?.slug || null;
}

export default async function PortalCatchAllPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; slug?: string[] }>;
}) {
  const { tenantSlug, slug } = await params;

  // Determine the page slug
  let pageSlug: string;
  if (!slug || slug.length === 0) {
    // Root portal URL — resolve home page
    const home = await getPortalHome(tenantSlug);
    if (!home) {
      return (
        <div className="portal-error">
          <h2>No Pages</h2>
          <p>This portal has no pages configured yet.</p>
        </div>
      );
    }
    pageSlug = home;
  } else {
    pageSlug = slug.join('/');
  }

  // Fetch page data
  const data = await getPageData(tenantSlug, pageSlug);

  if (!data) {
    return (
      <div className="portal-error">
        <h2>Page Not Found</h2>
        <p>The page &quot;/{pageSlug}&quot; does not exist in this portal.</p>
      </div>
    );
  }

  const { page } = data;
  const pageDef = page.definition || page.config || {};

  // Render based on page type
  switch (page.pageType) {
    case 'landing':
      return (
        <LandingRenderer
          title={page.title}
          heroTitle={(pageDef as any).heroTitle}
          heroSubtitle={(pageDef as any).heroSubtitle}
          ctaText={(pageDef as any).ctaText}
          ctaLink={(pageDef as any).ctaLink}
        />
      );

    case 'form':
      return (
        <FormRenderer
          title={page.title}
          formId={page.formId}
          formRef={(pageDef as any).formRef}
          tenantSlug={tenantSlug}
        />
      );

    case 'faq':
      return (
        <FaqRenderer
          title={page.title}
          faqItems={(pageDef as any).faqItems || []}
        />
      );

    case 'chat':
      return (
        <ChatRenderer
          title={page.title}
          welcomeMessage={(pageDef as any).welcomeMessage}
          chatProvider={(pageDef as any).chatProvider}
        />
      );

    case 'custom':
    default:
      return (
        <CustomRenderer
          title={page.title}
          content={(pageDef as any).content || ''}
        />
      );
  }
}
