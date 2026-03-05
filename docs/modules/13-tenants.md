# Module: Tenants

> **Package**: `packages/module-tenants/`
> **Name**: `@oven/module-tenants`
> **Dependencies**: `module-registry`, `module-config`
> **Status**: Planned

---

## 1. Overview

Tenants is the **multi-tenant identity module** that provides data isolation and organization management across the platform. Each tenant represents a client organization (e.g., a dental office, a school, a business unit) with a unique slug and identity.

The tenants table is intentionally slim — it stores only identity fields (`id`, `name`, `slug`, `enabled`, `metadata`). All operational configuration (schedule, tone, branding, contact info, services) lives in `module-config` as tenant-scoped config entries (see [module-config spec](./20-module-config.md)). Usage limits and billing are handled by `module-subscriptions` (see [module-subscriptions spec](./21-module-subscriptions.md)).

This separation follows [Rule 13: Config Centralization](../module-rules.md) — tenant-customizable settings must not live as columns on domain tables.

---

## 2. Core Concepts

### Tenant
A client organization with a unique slug and identity. Tenants are the top-level isolation boundary for all tenant-scoped data across the platform. The tenant record itself only tracks _what the entity is_ (identity), not _how it behaves_ (configuration).

### Tenant Member
A user associated with a tenant. Members have roles within the tenant context (owner, admin, member). A user can belong to multiple tenants.

### Tenant Config (via module-config)
Operational settings stored as `module-config` entries under `moduleName='tenants'`. Includes schedule, timezone, locale, tone, branding, contact info, services, and messaging templates. Resolved via the 5-tier cascade (see [Rule 8](../module-rules.md)).

### Tenant Subscription (via module-subscriptions)
Billing plan and usage limits managed by `module-subscriptions`. Replaces the previous `whatsappLimit` and `webLimit` columns with a dynamic service-based quota system.

---

## 3. Database Schema

### Tables

**`tenants`** — Tenant identity (slim)
```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),                              // freeform internal data (not config)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tenants_slug_idx').on(table.slug),
  index('tenants_enabled_idx').on(table.enabled),
]);
```

**`tenant_members`** — User-tenant associations (unchanged)
```typescript
export const tenantMembers = pgTable('tenant_members', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'), // owner | admin | member
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tm_tenant_id_idx').on(table.tenantId),
  index('tm_user_id_idx').on(table.userId),
  unique('tm_tenant_user').on(table.tenantId, table.userId),
]);
```

### Field Migration Map

The following fields were removed from the `tenants` table and relocated:

| Removed Field | Destination | Config Key / Location |
|---|---|---|
| nit | module-config | `tenants.NIT` |
| businessName | module-config | `tenants.BUSINESS_NAME` |
| logo | module-config | `tenants.LOGO` |
| timezone | module-config | `tenants.TIMEZONE` |
| locale | module-config | `tenants.LOCALE` |
| schedule | module-config | `tenants.SCHEDULE` |
| authorizedServices | module-config | `tenants.AUTHORIZED_SERVICES` |
| paymentMethods | module-config | `tenants.PAYMENT_METHODS` |
| tone | module-config | `tenants.TONE` |
| humanContactInfo | module-config | `tenants.HUMAN_CONTACT_INFO` |
| emergencyInstructions | module-config | `tenants.EMERGENCY_INSTRUCTIONS` |
| schedulingUrl | module-config | `tenants.SCHEDULING_URL` |
| welcomeMessageBusinessHours | module-config | `tenants.WELCOME_MESSAGE_BUSINESS_HOURS` |
| welcomeMessageOutOfHours | module-config | `tenants.WELCOME_MESSAGE_OUT_OF_HOURS` |
| whatsappLimit | module-subscriptions | `plan_quotas` for service `whatsapp` + optional `subscription_quota_overrides` |
| webLimit | module-subscriptions | `plan_quotas` for service `web-chat` + optional `subscription_quota_overrides` |

### Data Migration (Sprint 2)

```sql
-- Step 1: Insert existing tenant config values into module_configs
INSERT INTO module_configs (tenant_id, module_name, scope, key, value)
SELECT id, 'tenants', 'module', 'NIT', to_jsonb(nit)
FROM tenants WHERE nit IS NOT NULL;

INSERT INTO module_configs (tenant_id, module_name, scope, key, value)
SELECT id, 'tenants', 'module', 'BUSINESS_NAME', to_jsonb(business_name)
FROM tenants WHERE business_name IS NOT NULL;

-- ... repeat for each migrated field ...

INSERT INTO module_configs (tenant_id, module_name, scope, key, value)
SELECT id, 'tenants', 'module', 'TIMEZONE', to_jsonb(timezone)
FROM tenants;

INSERT INTO module_configs (tenant_id, module_name, scope, key, value)
SELECT id, 'tenants', 'module', 'SCHEDULE', schedule
FROM tenants WHERE schedule IS NOT NULL;

-- Step 2: Drop migrated columns
ALTER TABLE tenants
  DROP COLUMN nit,
  DROP COLUMN business_name,
  DROP COLUMN logo,
  DROP COLUMN timezone,
  DROP COLUMN locale,
  DROP COLUMN schedule,
  DROP COLUMN authorized_services,
  DROP COLUMN payment_methods,
  DROP COLUMN tone,
  DROP COLUMN human_contact_info,
  DROP COLUMN emergency_instructions,
  DROP COLUMN scheduling_url,
  DROP COLUMN welcome_message_business_hours,
  DROP COLUMN welcome_message_out_of_hours,
  DROP COLUMN whatsapp_limit,
  DROP COLUMN web_limit;
```

---

## 4. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET/POST | `/api/tenants` | List and create tenants | Authenticated |
| GET/PUT/DELETE | `/api/tenants/[id]` | Single tenant CRUD | Authenticated |
| GET | `/api/tenants/by-slug/[slug]` | Resolve tenant by slug | Authenticated |
| GET | `/api/tenants/[slug]/public` | Public tenant config (non-sensitive) | **Public** |
| GET/POST | `/api/tenants/[id]/members` | List and add members | Authenticated |
| DELETE | `/api/tenants/[id]/members/[userId]` | Remove a member | Authenticated |
| GET | `/api/tenants/[id]/business-hours` | Check if currently business hours | Authenticated |

### Public Tenant Config — Composition Pattern

`GET /api/tenants/[slug]/public` is now a **composition endpoint** that assembles data from multiple sources:

```typescript
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const db = getDb();

  // 1. Resolve tenant identity from slim table
  const [tenant] = await db.select()
    .from(tenants)
    .where(and(eq(tenants.slug, params.slug), eq(tenants.enabled, true)))
    .limit(1);

  if (!tenant) return notFound();

  // 2. Batch-resolve all 14 config keys from module-config
  const configKeys = [
    'BUSINESS_NAME', 'NIT', 'LOGO', 'TIMEZONE', 'LOCALE', 'SCHEDULE',
    'AUTHORIZED_SERVICES', 'PAYMENT_METHODS', 'TONE', 'HUMAN_CONTACT_INFO',
    'EMERGENCY_INSTRUCTIONS', 'SCHEDULING_URL',
    'WELCOME_MESSAGE_BUSINESS_HOURS', 'WELCOME_MESSAGE_OUT_OF_HOURS',
  ];

  const configRes = await fetch(
    `${baseUrl}/api/module-configs/resolve-batch?moduleName=tenants&tenantId=${tenant.id}&keys=${configKeys.join(',')}`
  );
  const { results } = await configRes.json();

  // 3. Compute isBusinessHours from resolved SCHEDULE + TIMEZONE
  const schedule = results.SCHEDULE?.value;
  const timezone = results.TIMEZONE?.value || 'America/Bogota';
  const isBusinessHours = computeBusinessHours(schedule, timezone);

  // 4. Assemble backward-compatible response
  return NextResponse.json({
    name: tenant.name,
    businessName: results.BUSINESS_NAME?.value,
    logo: results.LOGO?.value,
    timezone: results.TIMEZONE?.value || 'America/Bogota',
    locale: results.LOCALE?.value || 'es',
    schedule: results.SCHEDULE?.value,
    authorizedServices: results.AUTHORIZED_SERVICES?.value,
    paymentMethods: results.PAYMENT_METHODS?.value,
    tone: results.TONE?.value || 'friendly',
    schedulingUrl: results.SCHEDULING_URL?.value,
    welcomeMessageBusinessHours: results.WELCOME_MESSAGE_BUSINESS_HOURS?.value,
    welcomeMessageOutOfHours: results.WELCOME_MESSAGE_OUT_OF_HOURS?.value,
    isBusinessHours,
  });
}
```

The response shape is identical to the previous version — consumers are backward-compatible.

---

## 5. Business Hours Utility

```typescript
export function computeBusinessHours(schedule: Record<string, any> | null, timezone: string): boolean {
  if (!schedule) return false;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase();
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const currentTime = `${hour}:${minute}`;

  const daySchedule = schedule[weekday];
  if (!daySchedule) return false;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}
```

The `GET /api/tenants/[id]/business-hours` endpoint resolves `SCHEDULE` and `TIMEZONE` from module-config, then calls `computeBusinessHours()`.

---

## 6. Dashboard UI

### React Admin Resources

- **Tenants** — List, Create, Edit, Show
  - List: Datagrid with name, slug, enabled, member count
  - Create: Wizard-style form (Identity tab only for creation)
  - Edit: Tabbed form (see tabs below)
  - Show: Overview dashboard — config summary, active subscription, member activity

- **Tenant Members** — Inline within tenant show/edit (not a standalone resource)

### TenantEdit Form Tabs

| Tab | Fields | Source | Input Type |
|-----|--------|--------|------------|
| **Identity** | name, slug | tenants table | TextInput |
| **Config** | businessName, nit, logo, tone, timezone, locale, schedulingUrl | module-config | TextInput, FileInput, AutocompleteInput |
| **Schedule** | schedule (per day of week) | module-config (`SCHEDULE`) | `<ScheduleEditor>` |
| **Services** | authorizedServices, paymentMethods | module-config | `<ServicesTagInput>`, `<PaymentMethodsInput>` |
| **Communication** | humanContactInfo, emergencyInstructions, welcomeMessageBusinessHours, welcomeMessageOutOfHours | module-config | `<ContactInfoEditor>`, TextInput multiline |
| **Members** | (inline list) | tenant_members table | `<TenantMembersTab>` |

The **Limits tab** is removed — usage limits are managed by `module-subscriptions` in its own UI.

### Config Tab Implementation

Config tabs read/write through `module-config` API instead of the tenants table:

```typescript
// TenantConfigTab.tsx
const { record } = useEditContext();

// Read: resolve config values
const { data: config } = useQuery(['tenant-config', record.id], () =>
  fetch(`/api/module-configs/resolve-batch?moduleName=tenants&tenantId=${record.id}&keys=BUSINESS_NAME,NIT,LOGO,TONE,TIMEZONE,LOCALE,SCHEDULING_URL`)
    .then(r => r.json())
);

// Write: upsert config entry
const saveConfig = async (key: string, value: any) => {
  await fetch('/api/module-configs', {
    method: 'POST',
    body: JSON.stringify({ tenantId: record.id, moduleName: 'tenants', scope: 'module', key, value }),
  });
};
```

### Files to Create

```
apps/dashboard/src/components/tenants/
  TenantList.tsx           — All tenants. Columns: name, slug, enabled, member count
  TenantCreate.tsx         — Identity form: name, slug
  TenantEdit.tsx           — Tabbed form (Identity, Config, Schedule, Services, Communication, Members)
  TenantShow.tsx           — Overview dashboard: config summary, active subscription, members
  TenantConfigTab.tsx      — Config tab: reads/writes module-config entries
  TenantMembersTab.tsx     — Inline member list: add/remove users, assign roles
  ScheduleEditor.tsx       — 7 rows (Mon–Sun), each with time pickers + "closed" toggle
  ServicesTagInput.tsx     — Tag input for AUTHORIZED_SERVICES config
  PaymentMethodsInput.tsx  — Tag input for PAYMENT_METHODS config
  ContactInfoEditor.tsx    — Grouped inputs: phone, email, WhatsApp number
  WelcomeMessageEditor.tsx — Two textareas: business hours + out-of-hours messages
```

### Custom Pages

- **Tenant Dashboard** (`/tenants/[id]/dashboard`) — Overview with active subscription, member activity, config summary

### Menu Section

```
──── Tenants ────
Tenants
```

---

## 7. Events

| Event | Payload |
|-------|---------|
| `tenants.tenant.created` | id, name, slug |
| `tenants.tenant.updated` | id, name, slug |
| `tenants.tenant.deleted` | id, slug |
| `tenants.member.added` | tenantId, userId, role |
| `tenants.member.removed` | tenantId, userId |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-config** | All tenant operational config (schedule, tone, branding, etc.) stored as tenant-scoped config entries |
| **module-subscriptions** | Billing plans and usage limits (replaces whatsappLimit/webLimit columns) |
| **module-roles** | Permission-based access to manage tenants and members |
| **module-auth** | Tenant context attached to authenticated requests via middleware |
| **module-notifications** | Channel configs and conversations are tenant-scoped |
| **module-knowledge-base** | FAQ content is tenant-scoped |
| **module-chat** | Chat sessions can be tenant-scoped |
| **module-agent-core** | Agents can be tenant-specific with context injection |
| **module-workflow-agents** | `agent.tenantContext` node reads tenant config via module-config |
| **module-ui-flows** | Portals are tenant-scoped |
| **module-files** | File uploads can be tenant-scoped |

---

## 9. ModuleDefinition

```typescript
export const tenantsModule: ModuleDefinition = {
  name: 'tenants',
  dependencies: ['config'],
  description: 'Multi-tenant identity module with slim identity table and config-driven operational settings',
  capabilities: [
    'create tenants',
    'manage tenant members',
    'resolve tenant by slug',
    'check business hours',
  ],
  schema: { tenants, tenantMembers },
  seed: seedTenants,
  resources: [
    {
      name: 'tenants',
      list: TenantList,
      create: TenantCreate,
      edit: TenantEdit,
      show: TenantShow,
      icon: BusinessIcon,
      options: { label: 'Tenants' },
    },
  ],
  customRoutes: [
    { path: '/tenants/:id/dashboard', component: TenantDashboardPage },
  ],
  menuItems: [
    { label: 'Tenants', to: '/tenants' },
  ],
  apiHandlers: {
    'tenants': { GET: listTenants, POST: createTenant },
    'tenants/[id]': { GET: getTenant, PUT: updateTenant, DELETE: deleteTenant },
    'tenants/by-slug/[slug]': { GET: getTenantBySlug },
    'tenants/[slug]/public': { GET: getPublicTenantConfig },
    'tenants/[id]/members': { GET: listTenantMembers, POST: addTenantMember },
    'tenants/[id]/members/[userId]': { DELETE: removeTenantMember },
    'tenants/[id]/business-hours': { GET: checkBusinessHours },
  },
  configSchema: [
    // ─── Business Identity ────────────────────────────────────
    {
      key: 'NIT',
      type: 'string',
      description: 'Tax ID (NIT) for the business',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'BUSINESS_NAME',
      type: 'string',
      description: 'Legal business name',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'LOGO',
      type: 'string',
      description: 'Logo URL (via module-files)',
      defaultValue: null,
      instanceScoped: true,
    },
    // ─── Localization ─────────────────────────────────────────
    {
      key: 'TIMEZONE',
      type: 'string',
      description: 'Business timezone (IANA format)',
      defaultValue: 'America/Bogota',
      instanceScoped: true,
    },
    {
      key: 'LOCALE',
      type: 'string',
      description: 'Default language locale',
      defaultValue: 'es',
      instanceScoped: true,
    },
    // ─── Schedule ─────────────────────────────────────────────
    {
      key: 'SCHEDULE',
      type: 'json',
      description: 'Per-day business hours: { monday: { open, close }, ... }',
      defaultValue: null,
      instanceScoped: true,
    },
    // ─── Services & Payments ──────────────────────────────────
    {
      key: 'AUTHORIZED_SERVICES',
      type: 'json',
      description: 'List of services the tenant offers (e.g., ["limpieza", "ortodoncia"])',
      defaultValue: [],
      instanceScoped: true,
    },
    {
      key: 'PAYMENT_METHODS',
      type: 'json',
      description: 'Accepted payment methods (e.g., ["efectivo", "tarjeta"])',
      defaultValue: [],
      instanceScoped: true,
    },
    // ─── Communication ────────────────────────────────────────
    {
      key: 'TONE',
      type: 'string',
      description: 'Communication tone: formal | friendly | casual',
      defaultValue: 'friendly',
      instanceScoped: true,
    },
    {
      key: 'HUMAN_CONTACT_INFO',
      type: 'json',
      description: 'Human contact info: { phone, email, whatsapp }',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'EMERGENCY_INSTRUCTIONS',
      type: 'string',
      description: 'Emergency/escalation instructions for agents',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'SCHEDULING_URL',
      type: 'string',
      description: 'External scheduling/booking URL',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'WELCOME_MESSAGE_BUSINESS_HOURS',
      type: 'string',
      description: 'Welcome message shown during business hours',
      defaultValue: null,
      instanceScoped: true,
    },
    {
      key: 'WELCOME_MESSAGE_OUT_OF_HOURS',
      type: 'string',
      description: 'Welcome message shown outside business hours',
      defaultValue: null,
      instanceScoped: true,
    },
    // ─── Platform-Level Defaults ──────────────────────────────
    {
      key: 'MAX_MEMBERS_PER_TENANT',
      type: 'number',
      description: 'Maximum members per tenant',
      defaultValue: 50,
      instanceScoped: true,
    },
  ],
  events: {
    emits: [
      'tenants.tenant.created',
      'tenants.tenant.updated',
      'tenants.tenant.deleted',
      'tenants.member.added',
      'tenants.member.removed',
    ],
    schemas: {
      'tenants.tenant.created': {
        id: { type: 'number', description: 'Tenant DB ID', required: true },
        name: { type: 'string', description: 'Tenant display name' },
        slug: { type: 'string', description: 'URL-safe slug' },
      },
      'tenants.tenant.updated': {
        id: { type: 'number', description: 'Tenant DB ID', required: true },
        name: { type: 'string', description: 'Tenant display name' },
        slug: { type: 'string', description: 'URL-safe slug' },
      },
      'tenants.tenant.deleted': {
        id: { type: 'number', description: 'Tenant DB ID', required: true },
        slug: { type: 'string', description: 'URL-safe slug' },
      },
      'tenants.member.added': {
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        userId: { type: 'number', description: 'User DB ID', required: true },
        role: { type: 'string', description: 'Member role (owner/admin/member)' },
      },
      'tenants.member.removed': {
        tenantId: { type: 'number', description: 'Tenant DB ID', required: true },
        userId: { type: 'number', description: 'User DB ID', required: true },
      },
    },
  },
  chat: {
    description: 'Multi-tenant identity module. Manages tenant organizations with slim identity tables. Operational config (schedule, tone, branding) is stored in module-config. Usage limits are managed by module-subscriptions.',
    capabilities: [
      'list tenants',
      'get tenant config',
      'check business hours',
      'manage members',
    ],
    actionSchemas: [
      {
        name: 'tenants.list',
        description: 'List all tenants',
        parameters: {
          enabled: { type: 'boolean', description: 'Filter by enabled status' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['tenants.read'],
        endpoint: { method: 'GET', path: 'tenants' },
      },
      {
        name: 'tenants.getPublic',
        description: 'Get public tenant configuration by slug (assembled from module-config)',
        parameters: {
          slug: { type: 'string', description: 'Tenant slug', required: true },
        },
        returns: { name: { type: 'string' }, schedule: { type: 'object' }, isBusinessHours: { type: 'boolean' } },
        requiredPermissions: [],
        endpoint: { method: 'GET', path: 'tenants/[slug]/public' },
      },
      {
        name: 'tenants.checkBusinessHours',
        description: 'Check if a tenant is currently within business hours',
        parameters: {
          id: { type: 'number', description: 'Tenant ID', required: true },
        },
        returns: { isBusinessHours: { type: 'boolean' }, nextOpen: { type: 'string' } },
        requiredPermissions: ['tenants.read'],
        endpoint: { method: 'GET', path: 'tenants/[id]/business-hours' },
      },
    ],
  },
};
```

---

## 10. Seed Data

```typescript
export async function seedTenants(db: any) {
  const modulePermissions = [
    { resource: 'tenants', action: 'read', slug: 'tenants.read', description: 'View tenants' },
    { resource: 'tenants', action: 'create', slug: 'tenants.create', description: 'Create tenants' },
    { resource: 'tenants', action: 'update', slug: 'tenants.update', description: 'Edit tenants' },
    { resource: 'tenants', action: 'delete', slug: 'tenants.delete', description: 'Delete tenants' },
    { resource: 'tenant-members', action: 'read', slug: 'tenant-members.read', description: 'View tenant members' },
    { resource: 'tenant-members', action: 'create', slug: 'tenant-members.create', description: 'Add tenant members' },
    { resource: 'tenant-members', action: 'delete', slug: 'tenant-members.delete', description: 'Remove tenant members' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Mark public endpoints
  const publicEndpoints = [
    { module: 'tenants', route: 'tenants/[slug]/public', method: 'GET', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 11. API Handler Example

```typescript
// GET /api/tenants — List handler
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);

  const conditions = [];
  if (params.filter?.enabled !== undefined) {
    conditions.push(eq(tenants.enabled, params.filter.enabled));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(tenants).where(where)
      .orderBy(desc(tenants.createdAt))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(tenants).where(where),
  ]);

  return listResponse(rows, 'tenants', params, Number(count));
}
```

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — Identity-Only Table

The `tenants` table is intentionally slim with no tenant-customizable config columns (compliant with Rule 13):

```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tenants_slug_idx').on(table.slug),
  index('tenants_enabled_idx').on(table.enabled),
]);
```

The `tenant_members` table is tenant-scoped with `tenantId` column and appropriate indexes.

### B. Chat Block

See Section 9 — full `chat` block with description, capabilities, and 3 actionSchemas (list, getPublic, checkBusinessHours).

### C. configSchema

See Section 9 — 15 config keys declared: NIT, BUSINESS_NAME, LOGO, TIMEZONE, LOCALE, SCHEDULE, AUTHORIZED_SERVICES, PAYMENT_METHODS, TONE, HUMAN_CONTACT_INFO, EMERGENCY_INSTRUCTIONS, SCHEDULING_URL, WELCOME_MESSAGE_BUSINESS_HOURS, WELCOME_MESSAGE_OUT_OF_HOURS, MAX_MEMBERS_PER_TENANT.

All 14 relocated operational fields are stored in `module-config` and declared in `configSchema` per Rule 13.

### D. Typed Event Schemas

See Section 9 — 5 events with full typed schemas: `tenants.tenant.created`, `tenants.tenant.updated`, `tenants.tenant.deleted`, `tenants.member.added`, `tenants.member.removed`.

### E. Seed Function

See Section 10 — idempotent seed function that registers 7 permissions and 1 public endpoint.

### F. API Handler Example

See Section 11 — standard list handler using `parseListParams()` and `listResponse()` with Content-Range header.

---

## See Also

- [Admin Use Cases](../use-cases.md) — cross-module workflow guide. Relevant use cases:
  - **UC 2**: Onboard a New Tenant (Tenants + Config + Subscriptions)
  - **UC 3**: Configure Tenant Settings (Tenants + Config)
  - **UC 9**: Check Tenant Full Profile (Tenants + Config + Subscriptions)
- [Module Config Spec](./20-module-config.md) — config storage and 5-tier cascade
- [Module Subscriptions Spec](./21-module-subscriptions.md) — billing plans and usage limits
