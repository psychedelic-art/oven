/**
 * Pure assembler for the `GET /api/tenants/[slug]/public` response
 * body. Extracted so it can be unit-tested (DRIFT-2 regression) and
 * so the handler itself is only responsible for DB I/O.
 *
 * R3.5 constraint: public endpoints MUST NOT leak the numeric tenant
 * `id`. This assembler's return type explicitly omits `id`, so any
 * future edit that tries to add it fails typecheck.
 *
 * Sprint-03 DRIFT-2.
 */

/**
 * Slim tenant identity fields the assembler reads from. Declared as
 * a structural type so the handler can pass the Drizzle row
 * directly without a cast.
 */
export interface TenantIdentityForPublic {
  readonly name: string;
  // intentionally no `id`, no `enabled`, no `metadata`, no timestamps.
}

/** Resolved config keys relevant to the public response. */
export interface TenantPublicResolvedConfig {
  readonly BUSINESS_NAME?: unknown;
  readonly LOGO?: unknown;
  readonly TIMEZONE?: unknown;
  readonly LOCALE?: unknown;
  readonly SCHEDULE?: unknown;
  readonly AUTHORIZED_SERVICES?: unknown;
  readonly PAYMENT_METHODS?: unknown;
  readonly TONE?: unknown;
  readonly SCHEDULING_URL?: unknown;
  readonly WELCOME_MESSAGE_BUSINESS_HOURS?: unknown;
  readonly WELCOME_MESSAGE_OUT_OF_HOURS?: unknown;
}

/**
 * The exact JSON shape returned by the public endpoint. No numeric
 * id, no slug echo, no operational enabled flag, no timestamps.
 */
export interface TenantPublicResponse {
  readonly name: string;
  readonly businessName: unknown;
  readonly logo: unknown;
  readonly timezone: string;
  readonly locale: unknown;
  readonly schedule: unknown;
  readonly authorizedServices: unknown;
  readonly paymentMethods: unknown;
  readonly tone: unknown;
  readonly schedulingUrl: unknown;
  readonly welcomeMessageBusinessHours: unknown;
  readonly welcomeMessageOutOfHours: unknown;
  readonly isBusinessHours: boolean;
}

/**
 * Assemble the public response body. Pure — no I/O, no timezone
 * peeking, no clock reads. The handler computes `isBusinessHours`
 * via `computeBusinessHours(schedule, timezone)` and passes it in.
 */
export function assembleTenantPublicResponse(
  tenant: TenantIdentityForPublic,
  resolved: TenantPublicResolvedConfig,
  isBusinessHours: boolean,
): TenantPublicResponse {
  const timezone = (resolved.TIMEZONE as string) || 'America/Bogota';
  return {
    name: tenant.name,
    businessName: resolved.BUSINESS_NAME,
    logo: resolved.LOGO,
    timezone,
    locale: resolved.LOCALE || 'es',
    schedule: resolved.SCHEDULE ?? null,
    authorizedServices: resolved.AUTHORIZED_SERVICES || [],
    paymentMethods: resolved.PAYMENT_METHODS || [],
    tone: resolved.TONE || 'friendly',
    schedulingUrl: resolved.SCHEDULING_URL,
    welcomeMessageBusinessHours: resolved.WELCOME_MESSAGE_BUSINESS_HOURS,
    welcomeMessageOutOfHours: resolved.WELCOME_MESSAGE_OUT_OF_HOURS,
    isBusinessHours,
  };
}
