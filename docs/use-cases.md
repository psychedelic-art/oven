# Admin Use Cases

> Cross-module workflow guide for platform operators.
> Covers modules: [Config (20)](./modules/20-module-config.md), [Tenants (13)](./modules/13-tenants.md), [Subscriptions (21)](./modules/21-module-subscriptions.md), [UI Flows (22)](./modules/22-module-ui-flows.md), [Forms (19)](./modules/19-module-forms.md), [Flows (18)](./modules/18-module-flows.md).

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

---

## 13. Create a Portal (UI Flow)

**Goal**: Build a multi-page tenant portal using the visual drag-and-drop editor.

**Modules**: UI Flows (module-ui-flows + ui-flows-editor)

**Steps**:

1. **Create a UI flow** — Dashboard → UI Flows → Create.
   - `POST /api/ui-flows` — set name, slug, tenantId. A blank definition is auto-created.
2. **Open the visual editor** — Dashboard → UI Flows → Show → "Open Editor".
   - Route: `/#/ui-flows/:id/editor` — loads the ReactFlow canvas with PagePalette, toolbar, and panels.
3. **Drag pages onto the canvas** — Drag page types from the left PagePalette: Home, Landing, Form, FAQ, Chat, Custom.
   - Each page becomes a ReactFlow node with a slug, title, and type-specific content fields.
4. **Connect pages** — Draw edges between nodes to define navigation links.
5. **Configure each page** — Click a node → Inspector panel opens. Set page title, slug, content sections, and type-specific fields.
6. **Save the flow** — Click "Save" in the toolbar.
   - `PUT /api/ui-flows/:id` — persists the definition (pages, edges, navigation, settings) and theme config.

**Result**: A multi-page portal definition is saved, ready for theme/navigation configuration and publishing.

---

## 14. Configure Portal Theme and Navigation

**Goal**: Customize the look-and-feel and navigation structure of a tenant portal.

**Modules**: UI Flows (ui-flows-editor)

**Steps**:

1. **Open Theme panel** — Click the Palette icon in the editor toolbar.
   - Set primary/secondary/background colors, font family, border radius, logo URL.
   - The ThemePreviewSwatch at the bottom shows a live mini-preview with current colors, fonts, and buttons.
2. **Open Navigation panel** — Click the Menu icon in the editor toolbar.
   - Choose navigation type (sidebar or topbar).
   - Add/remove nav items, set labels and target pages.
   - Drag to reorder nav items (uses @dnd-kit sortable).
3. **Save** — Theme and navigation are persisted alongside the flow definition.

**Result**: Portal has branded theme colors, custom fonts, a logo, and organized navigation.

---

## 15. Publish and Preview a Portal

**Goal**: Make a portal live on a tenant subdomain and preview it before publishing.

**Modules**: UI Flows (module-ui-flows, ui-flows-editor)

**Steps**:

1. **Preview** — Click the eye icon in the editor toolbar to open the Preview panel. Select a viewport (Desktop/Tablet/Mobile). The iframe loads the portal page at `{tenant-slug}.{domain}/{page-slug}`.
2. **Publish** — Click "Publish" → confirm in the PublishDialog.
   - `POST /api/ui-flows/:id/publish` — creates a versioned snapshot. Increments `version`, sets `publishedAt`.
3. **Access the live portal** — Navigate to `{tenant-slug}.{domain}` — the subdomain middleware routes to the portal renderer.
   - `GET /api/ui-flows/by-slug/:slug` — retrieves the published flow, renders pages via Landing/Form/FAQ/Chat/Custom renderers.

**Result**: Portal is live at the tenant's subdomain. Pages render with the configured theme, navigation, and content.

---

## 16. Build a Form with the Visual Editor

**Goal**: Create a data-collection form using the GrapeJS drag-and-drop form builder.

**Modules**: Forms (module-forms + form-editor)

**Steps**:

1. **Create a form** — Dashboard → Forms → Create.
   - `POST /api/forms` — set name, slug, tenantId, status.
2. **Open the form editor** — Dashboard → Forms → Show → "Open Editor".
   - Route: `/#/forms/:id/editor` — loads the GrapeJS visual editor with 40+ oven-ui components.
3. **Drag form components** — Use the ShadCN/Tailwind component palette: text inputs, selects, checkboxes, date pickers, file uploads, radio groups, etc.
4. **Configure component properties** — Click a component → set label, placeholder, validation rules, conditional visibility.
5. **Save and version** — `PUT /api/forms/:id` — saves the GrapeJS definition. Versions are tracked in `form_versions`.
6. **Embed in a portal** — Add a Form page node in the UI Flow editor, reference the form by slug.

**Result**: A styled, validated form is ready for embedding in a portal page or standalone use.

---

## 17. Manage Flow Versions and Undo/Redo

**Goal**: Use version history to track changes and restore previous portal states.

**Modules**: UI Flows (ui-flows-editor)

**Steps**:

1. **Undo/Redo** — Use Ctrl+Z / Ctrl+Shift+Z (or toolbar buttons) to undo/redo canvas changes. The editor maintains a 50-entry history stack with debounced snapshots.
2. **View version history** — Click the History icon in the toolbar to open the VersionHistoryPanel.
   - `GET /api/ui-flows/:id/versions` — lists all published versions with timestamps.
3. **Restore a version** — Click "Restore" on any version entry.
   - `POST /api/ui-flows/:id/versions/:versionId/restore` — restores the flow definition to that version's state.
   - The canvas reloads with the restored pages, edges, navigation, and settings.

**Result**: Full audit trail of portal changes with ability to roll back to any published version.

---

## 18. Run a Content Approval Flow

**Goal**: Use the content flow system to manage FAQ or content through a review/approval pipeline.

**Modules**: Flows (module-flows)

**Steps**:

1. **Create a flow template** — Dashboard → Flow Templates → Create.
   - `POST /api/flow-templates` — define stages (e.g., Draft → Review → Approved → Published) with transition rules.
2. **Create a flow** — Dashboard → Flows → Create.
   - `POST /api/flows` — select template, set name, assign reviewers.
3. **Add items to the flow** — Dashboard → Flows → Show → Add Item.
   - `POST /api/flow-items` — add content items (e.g., FAQ entries, page copy) to the flow.
4. **Transition items** — Click stage buttons to move items through Draft → Review → Approved.
   - `POST /api/flow-transitions` — records who transitioned, when, and any comments.
5. **Add reviews** — Reviewers add comments and approvals.
   - `POST /api/flow-reviews` — attach review notes, approve/reject items.

**Result**: Content goes through a structured approval pipeline with full audit trail before going live.
