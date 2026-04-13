import type { PageDefinition } from '@/lib/types';
import { LandingRenderer } from './renderers/LandingRenderer';
import { FaqRenderer } from './renderers/FaqRenderer';
import { ChatRenderer } from './renderers/ChatRenderer';
import { FormRenderer } from './renderers/FormRenderer';
import { CustomRenderer } from './renderers/CustomRenderer';
import { cn } from '@oven/oven-ui';

interface PageRendererProps {
  page: PageDefinition;
  tenantSlug: string;
}

export function PageRenderer({ page, tenantSlug }: PageRendererProps) {
  const rawDef = page.definition || page.config || {};
  const pageDef = { ...rawDef, ...((rawDef as Record<string, unknown>).config as Record<string, unknown> || {}) };

  switch (page.pageType) {
    case 'landing':
      return (
        <LandingRenderer
          title={page.title}
          heroTitle={pageDef.heroTitle as string | undefined}
          heroSubtitle={pageDef.heroSubtitle as string | undefined}
          ctaText={pageDef.ctaText as string | undefined}
          ctaLink={pageDef.ctaLink as string | undefined}
        />
      );

    case 'form':
      return (
        <FormRenderer
          title={page.title}
          formId={page.formId}
          formRef={pageDef.formRef as string | undefined}
          tenantSlug={tenantSlug}
        />
      );

    case 'faq':
      return (
        <FaqRenderer
          title={page.title}
          faqItems={(pageDef.faqItems as Array<{ question: string; answer: string }>) || []}
        />
      );

    case 'chat':
      return (
        <ChatRenderer
          title={page.title}
          welcomeMessage={pageDef.welcomeMessage as string | undefined}
          chatProvider={pageDef.chatProvider as string | undefined}
        />
      );

    case 'custom':
    default:
      return (
        <CustomRenderer
          title={page.title}
          content={(pageDef.content as string) || ''}
        />
      );
  }
}
