import { describe, it, expect } from 'vitest';
import {
  assembleTenantPublicResponse,
  type TenantPublicResolvedConfig,
} from '../api/_utils/public-response';

// DRIFT-2: regression tests for the R3.5 no-numeric-id constraint
// on `GET /api/tenants/[slug]/public`. The assembler is the pure
// component of `tenants-public.handler.ts`; the handler itself is
// just DB I/O + computeBusinessHours + this call.

const resolvedFull: TenantPublicResolvedConfig = {
  BUSINESS_NAME: 'Acme Dental',
  LOGO: 'https://cdn.example.com/acme.png',
  TIMEZONE: 'America/Bogota',
  LOCALE: 'es',
  SCHEDULE: {
    monday: { open: '08:00', close: '18:00' },
  },
  AUTHORIZED_SERVICES: ['cleaning', 'whitening'],
  PAYMENT_METHODS: ['cash', 'card'],
  TONE: 'friendly',
  SCHEDULING_URL: 'https://acme.example.com/book',
  WELCOME_MESSAGE_BUSINESS_HOURS: 'Welcome!',
  WELCOME_MESSAGE_OUT_OF_HOURS: 'We are closed.',
};

describe('assembleTenantPublicResponse — DRIFT-2 R3.5 id leak guard', () => {
  it('does NOT include the numeric `id` on the response', () => {
    const body = assembleTenantPublicResponse(
      { name: 'Acme Dental' },
      resolvedFull,
      true,
    );
    expect(body).not.toHaveProperty('id');
  });

  it('does NOT include any other tenants-table internals', () => {
    const body = assembleTenantPublicResponse(
      { name: 'Acme Dental' },
      resolvedFull,
      true,
    );
    for (const forbidden of [
      'id',
      'slug',
      'enabled',
      'metadata',
      'createdAt',
      'updatedAt',
    ]) {
      expect(body).not.toHaveProperty(forbidden);
    }
  });

  it('does NOT smuggle `id` even when the caller passes one structurally', () => {
    // The assembler's `TenantIdentityForPublic` input type has no
    // `id` field, but JS doesn't enforce excess-property checks at
    // runtime. The assembler must still produce a body without
    // `id` even if the handler accidentally passes the full
    // Drizzle row.
    const body = assembleTenantPublicResponse(
      { name: 'Acme Dental', id: 42 } as { name: string; id: number },
      resolvedFull,
      true,
    );
    expect(body).not.toHaveProperty('id');
  });

  it('returns exactly the 13 expected fields and nothing else', () => {
    const body = assembleTenantPublicResponse(
      { name: 'Acme Dental' },
      resolvedFull,
      true,
    );
    expect(Object.keys(body).sort()).toEqual(
      [
        'authorizedServices',
        'businessName',
        'isBusinessHours',
        'locale',
        'logo',
        'name',
        'paymentMethods',
        'schedule',
        'schedulingUrl',
        'timezone',
        'tone',
        'welcomeMessageBusinessHours',
        'welcomeMessageOutOfHours',
      ].sort(),
    );
  });
});

describe('assembleTenantPublicResponse — defaults', () => {
  it('falls back to America/Bogota when timezone is absent', () => {
    const body = assembleTenantPublicResponse({ name: 'T' }, {}, false);
    expect(body.timezone).toBe('America/Bogota');
  });

  it('falls back to locale "es" when absent', () => {
    const body = assembleTenantPublicResponse({ name: 'T' }, {}, false);
    expect(body.locale).toBe('es');
  });

  it('falls back to tone "friendly" when absent', () => {
    const body = assembleTenantPublicResponse({ name: 'T' }, {}, false);
    expect(body.tone).toBe('friendly');
  });

  it('returns empty arrays for services/payments when absent', () => {
    const body = assembleTenantPublicResponse({ name: 'T' }, {}, false);
    expect(body.authorizedServices).toEqual([]);
    expect(body.paymentMethods).toEqual([]);
  });

  it('returns null for schedule when absent', () => {
    const body = assembleTenantPublicResponse({ name: 'T' }, {}, false);
    expect(body.schedule).toBeNull();
  });

  it('surfaces the caller-supplied isBusinessHours verbatim', () => {
    expect(
      assembleTenantPublicResponse({ name: 'T' }, {}, true).isBusinessHours,
    ).toBe(true);
    expect(
      assembleTenantPublicResponse({ name: 'T' }, {}, false).isBusinessHours,
    ).toBe(false);
  });
});

describe('assembleTenantPublicResponse — tenant identity passthrough', () => {
  it('passes `name` through verbatim', () => {
    const body = assembleTenantPublicResponse({ name: 'Clínica X' }, {}, true);
    expect(body.name).toBe('Clínica X');
  });

  it('uses resolved BUSINESS_NAME separately from identity name', () => {
    const body = assembleTenantPublicResponse(
      { name: 'Clínica X' },
      { BUSINESS_NAME: 'X Dental S.A.S.' },
      true,
    );
    expect(body.name).toBe('Clínica X');
    expect(body.businessName).toBe('X Dental S.A.S.');
  });
});
