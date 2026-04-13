'use client';

const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';

export function trackEvent(
  tenantSlug: string,
  event: string,
  metadata?: Record<string, unknown>,
): void {
  if (!ANALYTICS_ENABLED) return;

  fetch(`/api/portal/${tenantSlug}/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...metadata }),
  }).catch(() => {
    // Analytics is fire-and-forget — never block the UI
  });
}
