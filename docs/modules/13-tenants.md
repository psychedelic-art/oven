# Module: Tenants

> **Package**: `packages/module-tenants/`
> **Name**: `@oven/module-tenants`
> **Dependencies**: `module-registry`
> **Status**: Planned

---

## 1. Overview

Tenants is the **multi-tenant client configuration module** that provides data isolation, per-client branding, and operational settings across the platform. Each tenant represents a client organization (e.g., a dental office, a school, a business unit) with its own identity, schedule, services, contact information, and usage limits.

Every other module that stores tenant-specific data references a tenant via a plain `tenantId` integer column. The Tenants module provides the resolution layer — looking up tenant config by ID, slug, or custom domain — and exposes a public API for portal and widget initialization.

---

## 2. Core Concepts

### Tenant
A client organization with a unique slug, business identity, operational configuration, and branding. Tenants are the top-level isolation boundary for all tenant-scoped data across the platform.

### Tenant Member
A user associated with a tenant. Members have roles within the tenant context (owner, admin, member). A user can belong to multiple tenants.

### Business Schedule
Per-day opening hours stored as JSONB. Used by agent workflows to determine business-hours-aware behavior (welcome messages, escalation routing, auto-replies).

### Tenant Config
Operational settings that control tenant-specific behavior — message limits, authorized services, payment methods, tone preferences, emergency instructions, and scheduling URLs.

---

## 3. Database Schema

### Tables

**`tenants`** — Tenant definitions
```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  nit: varchar('nit', { length: 50 }),                             // tax ID (Colombia-specific, optional)
  businessName: varchar('business_name', { length: 255 }),
  logo: varchar('logo', { length: 500 }),                          // URL via module-files
  timezone: varchar('timezone', { length: 100 }).notNull().default('America/Bogota'),
  locale: varchar('locale', { length: 10 }).notNull().default('es'),
  schedule: jsonb('schedule'),                                      // { monday: { open: "08:00", close: "18:00" }, ... }
  authorizedServices: jsonb('authorized_services'),                 // ["limpieza", "ortodoncia", "blanqueamiento", ...]
  paymentMethods: jsonb('payment_methods'),                         // ["efectivo", "tarjeta", "transferencia"]
  tone: varchar('tone', { length: 50 }).notNull().default('friendly'), // formal | friendly | casual
  humanContactInfo: jsonb('human_contact_info'),                    // { phone, email, whatsapp }
  emergencyInstructions: text('emergency_instructions'),
  schedulingUrl: varchar('scheduling_url', { length: 500 }),
  welcomeMessageBusinessHours: text('welcome_message_business_hours'),
  welcomeMessageOutOfHours: text('welcome_message_out_of_hours'),
  whatsappLimit: integer('whatsapp_limit').notNull().default(300),
  webLimit: integer('web_limit').notNull().default(500),
  metadata: jsonb('metadata'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tenants_slug_idx').on(table.slug),
  index('tenants_enabled_idx').on(table.enabled),
]);
```

**`tenant_members`** — User-tenant associations
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

### Public Tenant Config Response

`GET /api/tenants/[slug]/public` returns non-sensitive config for portal/widget initialization:

```json
{
  "name": "Clínica Dental XYZ",
  "businessName": "Clínica Dental XYZ S.A.S.",
  "logo": "https://files.example.com/logo.png",
  "timezone": "America/Bogota",
  "locale": "es",
  "schedule": {
    "monday": { "open": "08:00", "close": "18:00" },
    "tuesday": { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday": { "open": "08:00", "close": "18:00" },
    "friday": { "open": "08:00", "close": "17:00" },
    "saturday": { "open": "09:00", "close": "13:00" },
    "sunday": null
  },
  "authorizedServices": ["limpieza", "ortodoncia", "blanqueamiento", "endodoncia"],
  "paymentMethods": ["efectivo", "tarjeta", "transferencia"],
  "tone": "friendly",
  "schedulingUrl": "https://calendar.example.com/clinica-xyz",
  "welcomeMessageBusinessHours": "¡Hola! Bienvenido a Clínica Dental XYZ. ¿En qué puedo ayudarte?",
  "welcomeMessageOutOfHours": "Hola, en este momento estamos fuera de horario. Nuestro horario es de lunes a viernes 8am-6pm.",
  "isBusinessHours": true
}
```

---

## 5. Business Hours Utility

```typescript
export function isBusinessHours(tenant: Tenant): boolean {
  const now = new Date();
  const tz = tenant.timezone || 'America/Bogota';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
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

  const daySchedule = tenant.schedule?.[weekday];
  if (!daySchedule) return false;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
}
```

---

## 6. Dashboard UI

### React Admin Resources

- **Tenants** — List, Create, Edit, Show
  - List: Datagrid with name, slug, enabled toggle, member count, schedule summary
  - Create: SimpleForm with business identity, schedule editor, services tag input, payment methods, tone selector
  - Edit: Tabbed form — General, Schedule, Services & Payments, Messaging, Limits
  - Show: Business card layout with schedule, members list, usage summary

- **Tenant Members** — Inline within tenant detail (not a standalone resource)
  - Datagrid showing user name, email, role, added date
  - Add member button with user autocomplete + role selector

### Custom Pages

- **Tenant Dashboard** (`/tenants/[id]/dashboard`) — Overview with usage stats, active conversations, member activity

### Menu Section

```
──── Organization ────
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
| **module-roles** | Permission-based access to manage tenants and members |
| **module-auth** | Tenant context attached to authenticated requests via middleware |
| **module-notifications** | Channel configs and usage limits are tenant-scoped |
| **module-knowledge-base** | FAQ content is tenant-scoped |
| **module-chat** | Chat sessions can be tenant-scoped |
| **module-agent-core** | Agents can be tenant-specific with context injection |
| **module-workflow-agents** | `agent.tenantContext` node reads tenant config |
| **module-ui-flows** | Portals are tenant-scoped |
| **module-files** | File uploads can be tenant-scoped |

---

## 9. ModuleDefinition

```typescript
export const tenantsModule: ModuleDefinition = {
  name: 'tenants',
  dependencies: [],
  description: 'Multi-tenant client configuration with business identity, schedules, and usage limits',
  capabilities: [
    'create tenants',
    'manage tenant members',
    'configure business hours',
    'set usage limits',
    'resolve tenant by slug',
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
    {
      key: 'DEFAULT_WHATSAPP_LIMIT',
      type: 'number',
      description: 'Default monthly WhatsApp message limit for new tenants',
      defaultValue: 300,
      instanceScoped: false,
    },
    {
      key: 'DEFAULT_WEB_LIMIT',
      type: 'number',
      description: 'Default monthly web chat message limit for new tenants',
      defaultValue: 500,
      instanceScoped: false,
    },
    {
      key: 'DEFAULT_TIMEZONE',
      type: 'string',
      description: 'Default timezone for new tenants',
      defaultValue: 'America/Bogota',
      instanceScoped: false,
    },
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
    description: 'Multi-tenant client configuration. Manages business identity, schedules, services, and usage limits for client organizations.',
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
        description: 'Get public tenant configuration by slug',
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
