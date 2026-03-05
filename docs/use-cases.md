# Admin Use Cases

> Cross-module workflow guide for platform operators.
> Covers modules: [Config (20)](./modules/20-module-config.md), [Tenants (13)](./modules/13-tenants.md), [Subscriptions (21)](./modules/21-module-subscriptions.md).

---

## 1. Initial Platform Setup

**Goal**: Bootstrap the service catalog, billing plans, and platform-level config defaults so tenants can be onboarded.

**Modules**: Config, Subscriptions

**Steps**:

1. **Create service categories** — Dashboard → Service Catalog → Categories → Create.
   - `POST /api/service-categories` — e.g., Messaging, AI, Storage.
2. **Create services** — Dashboard → Service Catalog → Services → Create.
   - `POST /api/services` — e.g., WhatsApp Messages, SMS Messages, AI Tokens. Link each to a category.
3. **Register providers** — Dashboard → Service Catalog → Providers → Create.
   - `POST /api/providers` — e.g., Twilio, Meta, OpenAI.
4. **Map providers to services** — Dashboard → Service Catalog → Provider Services → Create.
   - `POST /api/provider-services` — link Twilio → WhatsApp Messages, set `configSchema` describing required credentials.
5. **Create billing plans** — Dashboard → Service Catalog → Billing Plans → Create.
   - `POST /api/billing-plans` — e.g., Free, Starter, Pro. Set price, currency, billing cycle.
6. **Define plan quotas** — Dashboard → Billing Plans → Show plan → Add Quota.
   - `POST /api/plan-quotas` — set per-service limits for each plan (e.g., Free plan: 100 WhatsApp messages/month).
7. **Set platform defaults** — Dashboard → Automation → Module Configs → Create.
   - `POST /api/module-configs` — set platform-level defaults (tenantId=null): DEFAULT_PLAN_SLUG, TRIAL_DURATION_DAYS, TIMEZONE, LOCALE.

**Result**: Platform has a service catalog, billing plans with quotas, and sensible defaults. Ready for tenant onboarding.

---

## 2. Onboard a New Tenant

**Goal**: Create a tenant, assign a billing plan, configure initial settings, and add team members.

**Modules**: Tenants, Config, Subscriptions

**Steps**:

1. **Create the tenant** — Dashboard → Tenants → Tenants → Create.
   - `POST /api/tenants` — provide name, slug, enabled=true.
2. **Create a subscription** — Dashboard → Tenants → Subscriptions → Create.
   - `POST /api/tenant-subscriptions` — set tenantId, planId (e.g., Free), status=active or status=trial.
3. **Configure tenant settings** — Dashboard → Automation → Module Configs → Create (with tenantId set).
   - `POST /api/module-configs` — set tenant-scoped overrides: TIMEZONE, LOCALE, BUSINESS_NAME, TONE, SCHEDULE, LOGO.
4. **Add team members** — Dashboard → Tenants → Members → Create.
   - `POST /api/tenant-members` — add owner/admin/member users to the tenant.

**Result**: Tenant is live with a billing plan, configured settings, and team members. The tenant inherits platform defaults for any unset config keys.

---

## 3. Configure Tenant Settings

**Goal**: Customize operational settings for a specific tenant (timezone, schedule, tone, branding).

**Modules**: Tenants, Config

**Steps**:

1. **Navigate to tenant** — Dashboard → Tenants → click tenant → Show page.
2. **Click "View Config"** — opens filtered Module Configs list for that tenant.
3. **Create or edit config entries** — set keys like:
   - `TIMEZONE` = "America/New_York"
   - `SCHEDULE` = `{"mon":{"open":"09:00","close":"17:00"}, ...}`
   - `TONE` = "friendly"
   - `BUSINESS_NAME` = "Acme Dental"
   - `WELCOME_MESSAGE_BUSINESS_HOURS` = "Hello! How can we help you today?"
   - `WELCOME_MESSAGE_OUT_OF_HOURS` = "We're currently closed. Leave a message!"

**Result**: Tenant has custom settings that override platform defaults. The 5-tier cascade ensures unset keys fall through to platform-level values.

---

## 4. Set Up Provider Credentials

**Goal**: Store API keys/secrets for upstream providers so the platform can make calls on behalf of tenants.

**Modules**: Config, Subscriptions

**Steps**:

1. **Check provider-service configSchema** — Dashboard → Provider Services → click mapping → view the `configSchema` field.
   - This shows which credential fields are needed (e.g., `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
2. **Store platform-level credentials** — Dashboard → Module Configs → Create.
   - `POST /api/module-configs` with tenantId=null, moduleName="subscriptions", key="TWILIO_ACCOUNT_SID", value=`"AC..."`.
3. **Optionally store tenant-specific credentials** — same endpoint with tenantId set.
   - Some tenants may bring their own Twilio account for whitelabeling.

**Result**: Provider credentials are stored securely in module-config. The 5-tier cascade allows tenant-specific credentials to override platform defaults.

---

## 5. Create a Billing Plan

**Goal**: Define a new billing plan with per-service quotas and pricing.

**Modules**: Subscriptions

**Steps**:

1. **Create the plan** — Dashboard → Service Catalog → Billing Plans → Create.
   - `POST /api/billing-plans` — set name="Pro", slug="pro", price=49.99, currency="USD", billingCycle="monthly", isPublic=true.
2. **Add quotas** — Dashboard → Billing Plans → Show plan → Add Quota.
   - `POST /api/plan-quotas` — for each service:
     - WhatsApp Messages: 5000/month
     - SMS Messages: 1000/month
     - AI Tokens: 100000/month
3. **Verify public listing** — `GET /api/billing-plans/public` returns the plan with its quotas for the pricing page.

**Result**: New billing plan is available for tenant subscriptions. If marked `isPublic=true`, it appears on the pricing page.

---

## 6. Upgrade/Downgrade a Plan

**Goal**: Change a tenant's billing plan. Quotas update immediately.

**Modules**: Subscriptions

**Steps**:

1. **Find the subscription** — Dashboard → Tenants → Subscriptions → filter by tenantId.
   - `GET /api/tenant-subscriptions?tenantId=42`
2. **Edit the subscription** — click → Edit → change `planId` to the new plan.
   - `PUT /api/tenant-subscriptions/:id` — update planId.
3. **Verify new limits** — `GET /api/tenant-limits?tenantId=42` shows the new plan's quotas.

**Result**: Tenant's effective limits now reflect the new plan's quotas. Any existing quota overrides are preserved and continue to take precedence.

---

## 7. Add a New Service to the Platform

**Goal**: Introduce a new upstream service (e.g., voice calls) and make it available in billing plans.

**Modules**: Subscriptions

**Steps**:

1. **Create category** (if needed) — Dashboard → Service Catalog → Categories → Create.
   - `POST /api/service-categories` — e.g., "Voice".
2. **Create the service** — Dashboard → Services → Create.
   - `POST /api/services` — name="Voice Minutes", slug="voice-minutes", unitLabel="minutes", categoryId=N.
3. **Map to provider** — Dashboard → Provider Services → Create.
   - `POST /api/provider-services` — link Twilio → Voice Minutes, set `isDefault=true`, define `configSchema`.
4. **Add to billing plans** — Dashboard → Billing Plans → Show plan → Add Quota.
   - `POST /api/plan-quotas` — add voice-minutes quota to each plan (e.g., Pro: 500 minutes/month).

**Result**: New service is in the catalog, mapped to a provider, and available in billing plans.

---

## 8. Override Config for One Tenant

**Goal**: Set a tenant-specific config value that differs from the platform default.

**Modules**: Config

**Steps**:

1. **Check current resolved value** — `GET /api/module-configs/resolve?moduleName=tenants&key=TIMEZONE&tenantId=42`.
   - Response shows current value and its source (e.g., `source: "platform-module"`).
2. **Create tenant override** — Dashboard → Module Configs → Create.
   - `POST /api/module-configs` — tenantId=42, moduleName="tenants", scope="module", key="TIMEZONE", value=`"Asia/Tokyo"`.
3. **Verify resolution** — same resolve endpoint now returns `source: "tenant-module"`.

**Result**: Tenant 42 sees "Asia/Tokyo" as their timezone while all other tenants still inherit the platform default.

---

## 9. Check Tenant Full Profile

**Goal**: See a tenant's complete picture — identity, config, and usage limits — in one place.

**Modules**: Tenants, Config, Subscriptions

**Steps**:

1. **View tenant identity** — Dashboard → Tenants → click tenant → Show page.
   - Shows: name, slug, enabled, members, creation date.
2. **View tenant config** — Click "View Config" button on the Show page.
   - Shows all config entries scoped to this tenant.
3. **View effective limits** — `GET /api/tenant-limits?tenantId=42`.
   - Returns plan name + per-service limits with source (plan vs override).
4. **Public profile endpoint** — `GET /api/tenants/public?slug=acme-dental`.
   - Returns composed view: identity + batch-resolved config + `isBusinessHours` flag.

**Result**: Full tenant profile visible across three resource types. The public endpoint provides a single-call composition for client apps.

---

## 10. Add a New Provider

**Goal**: Register a new upstream provider (e.g., Vonage) and map it to existing services.

**Modules**: Subscriptions

**Steps**:

1. **Create the provider** — Dashboard → Service Catalog → Providers → Create.
   - `POST /api/providers` — name="Vonage", slug="vonage", type="cloud", website="https://vonage.com".
2. **Map to services** — Dashboard → Provider Services → Create.
   - `POST /api/provider-services` — link Vonage → SMS Messages with costPerUnit and configSchema.
   - Set `isDefault=false` (Twilio remains default unless changed).
3. **Store credentials** — Dashboard → Module Configs → Create.
   - `POST /api/module-configs` — platform-level Vonage API key/secret.

**Result**: Vonage is registered as an alternative SMS provider. Tenants can be switched to Vonage by updating their provider-service config.

---

## 11. Manage Platform Defaults

**Goal**: Set or update global default config values that all tenants inherit.

**Modules**: Config

**Steps**:

1. **List platform defaults** — Dashboard → Module Configs → filter tenantId = empty.
   - `GET /api/module-configs?tenantId_isnull=true` shows all platform-level entries.
2. **Create a new default** — Dashboard → Module Configs → Create (leave tenantId empty).
   - `POST /api/module-configs` — e.g., moduleName="tenants", key="LOCALE", value=`"en-US"`.
3. **Update an existing default** — click → Edit → change value.
   - `PUT /api/module-configs/:id` — update the value.

**Result**: All tenants without a tenant-specific override will now inherit the updated default value via the 5-tier cascade.

---

## 12. VIP Tenant Extra Quotas

**Goal**: Give a specific tenant higher quotas than their plan allows (e.g., a VIP customer or trial extension).

**Modules**: Subscriptions

**Steps**:

1. **Find the subscription** — Dashboard → Tenants → Subscriptions → filter by tenantId.
   - `GET /api/tenant-subscriptions?tenantId=42`
2. **View current limits** — Dashboard → Subscriptions → Show → see plan quotas.
3. **Add quota override** — Click "Add Override" on the Subscription Show page.
   - `POST /api/quota-overrides` — subscriptionId=N, serviceId=M, quota=10000, reason="VIP customer — extended trial".
4. **Verify** — `GET /api/tenant-limits?tenantId=42` now shows the override with `source: "override"`.

**Result**: The tenant gets higher limits for specific services without changing their billing plan. The override reason is documented for audit.
