# Module Tenants — Database

## Schema overview

Two tables, both declared in `packages/module-tenants/src/schema.ts`:

| Table | Purpose | Columns | Tenant-scoped |
|---|---|---|---|
| `tenants` | Client-organization identity | 7 | top-level (itself) |
| `tenant_members` | User ↔ tenant many-to-many + role | 5 | via `tenant_id` FK |

## `tenants` — identity table

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

### Column notes

- **`slug`** — public URL identifier. Used by the portal, the chat widget,
  and the public composition endpoint. Must match `^[a-z0-9-]{1,128}$`
  (enforced at the handler level, not the DB).
- **`enabled`** — soft off switch. The public endpoint filters on
  `enabled = true` before returning data. Subscriptions and billing can
  disable a tenant without losing its history.
- **`metadata`** — freeform internal JSONB for OVEN ops (imported-from-id,
  onboarding notes, migration markers). **Not** tenant-customizable. Rule
  13 forbids putting tenant settings here — those belong in `module_configs`.

### Indexes

- `tenants_slug_idx` on `(slug)` — used by `GET /api/tenants/by-slug/[slug]`
  and by the public endpoint. High-frequency lookup.
- `tenants_enabled_idx` on `(enabled)` — used by list queries filtering
  disabled tenants.
- `tenants_slug_key` (implicit unique) — enforces slug uniqueness.

## `tenant_members` — membership table

```typescript
export const tenantMembers = pgTable('tenant_members', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tm_tenant_id_idx').on(table.tenantId),
  index('tm_user_id_idx').on(table.userId),
  unique('tm_tenant_user').on(table.tenantId, table.userId),
]);
```

### Column notes

- **`tenantId`** — FK to `tenants.id`. Rule 4.3: plain integer, **no
  Drizzle `references()`** — cross-table FKs are resolved at the handler
  level via explicit joins.
- **`userId`** — FK to `users.id` (owned by `module-auth` once it lands).
- **`role`** — free-form varchar. Authorized values today: `owner`,
  `admin`, `member`. Enforced at the API layer, not in the DB. When
  `module-auth` ships role-backed permissions, this string will map onto
  its `roles` table.

### Indexes

- `tm_tenant_id_idx` — used by "list members of tenant X".
- `tm_user_id_idx` — used by "list tenants of user Y" (reverse lookup
  needed by `module-auth` login flow).
- `tm_tenant_user` unique compound — prevents duplicate membership rows.

## Row-Level Security

RLS is **planned but not yet applied**. The plan:

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Platform admins see every tenant row
CREATE POLICY tenants_platform_admin_all ON tenants
  FOR ALL
  USING (current_setting('app.role', true) = 'platform_admin');

-- Tenant members see their own tenant row
CREATE POLICY tenants_member_read ON tenants
  FOR SELECT
  USING (
    id = ANY (
      string_to_array(current_setting('app.tenant_ids', true), ',')::int[]
    )
  );

-- The public endpoint bypasses RLS via SECURITY DEFINER function
CREATE FUNCTION public_tenant_by_slug(slug_in text)
  RETURNS SETOF tenants
  LANGUAGE sql
  SECURITY DEFINER
  AS $$
    SELECT * FROM tenants WHERE slug = slug_in AND enabled = true;
  $$;
```

`tenant_members` RLS policies mirror `tenants` — the platform admin sees
everything, each user sees their own membership rows, and insert/delete
require `tenants.update` or `tenant-members.create`.

Tracked in the todo sprint plan as sprint-03 (security hardening).

## Migrations

The module ships a single initial migration that creates both tables with
their indexes and unique constraints. The column-relocation migration
(dropping 14 settings columns from the legacy `tenants` table and copying
their values into `module_configs`) is `sprint-02` in the todo plan and
has not yet run on any deployed environment — it is gated on the UI
migration for the tenant config tab in the dashboard.

## Seed data

`seedTenants()` inserts permissions + the public endpoint entry; it does
**not** insert demo tenants. Demo tenants come from the dashboard seed in
`apps/dashboard/src/lib/seed.ts`, which calls `seedTenants` first to
guarantee the permission rows exist.

Idempotency: every insert uses `onConflictDoNothing()`, so the seed can
run on a non-empty database without error. See
`docs/modules/todo/PROGRESS.md` for the `pnpm db:seed` idempotency audit.

## Config schema

Fifteen entries registered through `module-config`. See
[`module-design.md`](./module-design.md#configschema) for the complete
list and [`detailed-requirements.md`](./detailed-requirements.md#r4-config-storage)
for why each key is `instanceScoped: true`.

## Cross-reference

| Field on old `tenants` table | Destination | Config key |
|---|---|---|
| `nit` | `module_configs` | `tenants.NIT` |
| `business_name` | `module_configs` | `tenants.BUSINESS_NAME` |
| `logo` | `module_configs` | `tenants.LOGO` |
| `timezone` | `module_configs` | `tenants.TIMEZONE` |
| `locale` | `module_configs` | `tenants.LOCALE` |
| `schedule` | `module_configs` | `tenants.SCHEDULE` |
| `authorized_services` | `module_configs` | `tenants.AUTHORIZED_SERVICES` |
| `payment_methods` | `module_configs` | `tenants.PAYMENT_METHODS` |
| `tone` | `module_configs` | `tenants.TONE` |
| `human_contact_info` | `module_configs` | `tenants.HUMAN_CONTACT_INFO` |
| `emergency_instructions` | `module_configs` | `tenants.EMERGENCY_INSTRUCTIONS` |
| `scheduling_url` | `module_configs` | `tenants.SCHEDULING_URL` |
| `welcome_message_business_hours` | `module_configs` | `tenants.WELCOME_MESSAGE_BUSINESS_HOURS` |
| `welcome_message_out_of_hours` | `module_configs` | `tenants.WELCOME_MESSAGE_OUT_OF_HOURS` |
| `whatsapp_limit` | `plan_quotas` | service `whatsapp` |
| `web_limit` | `plan_quotas` | service `web-chat` |
