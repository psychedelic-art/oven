import { cn } from '@oven/oven-ui';

interface LandingRendererProps {
  title: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function LandingRenderer({
  title,
  heroTitle,
  heroSubtitle,
  ctaText,
  ctaLink,
}: LandingRendererProps) {
  return (
    <div className={cn('portal-hero')}>
      <h1>{heroTitle || title}</h1>
      {heroSubtitle && <p>{heroSubtitle}</p>}
      {ctaText && ctaLink && (
        <a href={`/${ctaLink}`} className={cn('cta-btn')}>
          {ctaText}
        </a>
      )}
    </div>
  );
}
