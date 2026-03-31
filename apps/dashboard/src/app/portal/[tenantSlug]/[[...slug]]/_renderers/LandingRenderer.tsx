interface LandingRendererProps {
  title: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Renders a landing page with a hero section and optional CTA button.
 */
export default function LandingRenderer({
  title,
  heroTitle,
  heroSubtitle,
  ctaText,
  ctaLink,
}: LandingRendererProps) {
  return (
    <div className="portal-hero">
      <h1>{heroTitle || title}</h1>
      {heroSubtitle && <p>{heroSubtitle}</p>}
      {ctaText && ctaLink && (
        <a href={`/${ctaLink}`} className="cta-btn">
          {ctaText}
        </a>
      )}
    </div>
  );
}
