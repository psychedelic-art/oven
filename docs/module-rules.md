# OVEN Module Rules

> Every module in the OVEN platform must comply with these rules.
> These are not guidelines — they are hard requirements.
> A module that breaks a rule will not integrate correctly with the platform.

---

## Rule 1: Registered as a Module

Every module **must** implement the `ModuleDefinition` contract and register itself via `registry.register()` in `apps/dashboard/src/lib/modules.ts`.

### 1.1 — ModuleDefinition contract

```typescript
// Every module exports a const that satisfies ModuleDefinition
export const myModule: ModuleDefinition = {
  name: string;                    // REQUIRED — unique slug: "tenants", "knowledge-base", "ai"
  dependencies?: string[];         // Modules this one requires (validated at registration)
  schema: Record<string, unknown>; // REQUIRED — Drizzle table definitions
  seed?: (db: any) => Promise<void>;
  resources: ResourceConfig[];     // REQUIRED — React Admin CRUD resources (can be [])
  customRoutes?: CustomRouteConfig[];
  menuItems?: MenuItemConfig[];
  apiHandlers: ApiHandlerMap;      // REQUIRED — REST endpoints (can be {})
  configSchema?: ConfigSchemaEntry[];
  events?: { emits?, listeners?, schemas? };

  // Extended fields (required for agent discovery):
  description?: string;
  capabilities?: string[];
  chat?: { description, capabilities, actionSchemas };
};
```

### 1.2 — Registration order

Register in dependency order. If module A depends on module B, B must be registered first. The registry validates this at `register()` time and throws if a dependency is missing.

```typescript
// apps/dashboard/src/lib/modules.ts
registry.register(tenantsModule);      // no deps
registry.register(authModule);         // depends: roles
registry.register(aiModule);           // depends: registry, roles
registry.register(agentCoreModule);    // depends: registry, roles, ai
```

### 1.3 — Package location

```
packages/module-{name}/       ← module packages
packages/{name}-editor/       ← editor/UI-only packages (no ModuleDefinition)
packages/{adapter-name}/      ← integration adapter packages
```

### 1.4 — Package structure

```
packages/module-{name}/
  package.json               ← name: "@oven/module-{name}"
  tsconfig.json
  src/
    index.ts                 ← exports ModuleDefinition + schema + seed + engine
    schema.ts                ← Drizzle pgTable definitions
    types.ts                 ← TypeScript types
    seed.ts                  ← optional seed function
    api/
      {resource}.handler.ts              ← GET (list) + POST (create)
      {resource}-by-id.handler.ts        ← GET + PUT + DELETE for single record
      {resource}-{action}.handler.ts     ← custom actions
```

---

## Rule 2: Discoverable

Every module must describe itself so that agents, the Tool Wrapper, and other modules can discover its capabilities at runtime without hardcoded references.

### 2.1 — Self-description via `chat` block

```typescript
chat: {
  description: "Human-readable summary of what this module does",
  capabilities: ["verb noun", "verb noun", ...],  // e.g., "search FAQ entries"
  actionSchemas: [
    {
      name: "kb.searchEntries",
      description: "Search the knowledge base for FAQ entries matching a query",
      parameters: { /* JSON Schema */ },
      returns: { /* JSON Schema */ },
      requiredPermissions: ["knowledge-base.read"],
      endpoint: { method: "POST", path: "knowledge-base/[tenantSlug]/search" }
    }
  ]
}
```

**Why**: The Tool Wrapper in `module-agent-core` calls `registry.getAll()` and reads each module's `chat` block to build the tool catalog. Without it, agents cannot discover or invoke your module's actions.

### 2.2 — API endpoints are auto-discovered

Even without a `chat` block, your `apiHandlers` are discoverable via `registry.getAllApiEndpoints()`. But the `chat` block provides richer, LLM-optimized descriptions that improve tool selection accuracy. Always provide both.

### 2.3 — Event schemas are documented

Every emitted event must have a typed schema in `events.schemas` so the wiring editor can offer autocomplete and the transform validator can check `$.path` expressions:

```typescript
events: {
  emits: ["kb.entry.created", "kb.entry.updated"],
  schemas: {
    "kb.entry.created": {
      id: { type: "number", description: "Entry DB ID", required: true },
      tenantId: { type: "number", description: "Owning tenant", required: true },
      question: { type: "string", description: "FAQ question text" },
    }
  }
}
```

---

## Rule 3: Pluggable

Modules must be addable and removable without modifying other modules' code. The system must function with any subset of modules registered.

### 3.1 — No required cross-module imports

A module must **never** import another module's business logic directly. Communication happens through:
- **EventBus** (pub/sub)
- **REST API calls** (via execution strategies)
- **Registry discovery** (`registry.getModule()`, `registry.getAll()`)
- **Config cascade** (`GET /api/module-configs/resolve`)

**Wrong**:
```typescript
import { searchEntries } from '@oven/module-knowledge-base';  // FORBIDDEN
```

**Right**:
```typescript
// Call via API (NetworkStrategy or DirectStrategy)
const response = await fetch('/api/knowledge-base/clinic-xyz/search', {
  method: 'POST', body: JSON.stringify({ query: "horarios" })
});
```

### 3.2 — Optional dependencies use lazy resolution

If a module optionally uses another module that may not be installed, use the lazy resolution pattern from `wiring-runtime.ts`:

```typescript
let _engine: any = null;
function getEngine(): any {
  if (!_engine) {
    try {
      _engine = require('@oven/module-workflows/engine').workflowEngine;
    } catch {
      _engine = null;  // module not installed — skip gracefully
    }
  }
  return _engine;
}
```

### 3.3 — Adapter pattern for external integrations

When a module integrates with external services (auth providers, notification channels, AI providers, vector databases), it must define an **adapter interface** and load implementations from separate packages:

```typescript
// In module-notifications/src/adapters/types.ts — the interface
export interface NotificationAdapter {
  name: string;
  channelType: 'whatsapp' | 'sms' | 'email';
  sendMessage(to: string, content: MessageContent): Promise<SendResult>;
  parseInboundWebhook(req: NextRequest): Promise<InboundMessage>;
  verifyWebhookSignature(req: NextRequest): Promise<boolean>;
}

// In notifications-twilio/src/index.ts — the implementation
export const twilioAdapter: NotificationAdapter = { name: 'twilio', ... };

// In apps/dashboard/src/lib/modules.ts — the wiring
import { registerNotificationAdapter } from '@oven/module-notifications';
import { twilioAdapter } from '@oven/notifications-twilio';
registerNotificationAdapter(twilioAdapter);
```

**Rule**: The module package must never `import` a specific adapter package. Adapters are registered externally at application startup.

### 3.4 — Schema composition via registry

All Drizzle table definitions are composed at runtime via `registry.getComposedSchema()`. Your module's `schema` export is merged into the global schema object. Table names must be globally unique.

---

## Rule 4: Loosely Coupled

Modules communicate exclusively through decoupled mechanisms. No module should break if another module is removed (unless it's a declared dependency).

### 4.1 — Events follow the naming convention

```
{module}.{entity}.{action}
```

Examples: `kb.entry.created`, `notifications.message.received`, `agents.execution.completed`

### 4.2 — Cross-module reactions use EventBus or Wirings

**EventBus** (code-defined): Declare listeners in the module's `events.listeners`:

```typescript
events: {
  listeners: {
    "kb.entry.created": async (payload) => {
      // Auto-embed the new entry
      await embedEntry(payload.id);
    }
  }
}
```

**Wirings** (DB-defined, configurable at runtime): Stored in `event_wirings` table. Managed via the wiring editor. Support `$.path` transforms and conditions.

**Workflow triggers** (complex reactions): Set `triggerEvent` on a workflow definition. The wiring runtime auto-executes the workflow when the event fires.

### 4.3 — Foreign keys are plain integers

Cross-module foreign keys use `integer()` columns, not Drizzle `references()`. This avoids schema-level coupling and allows modules to be registered in any order.

```typescript
// RIGHT — plain integer
tenantId: integer('tenant_id'),

// WRONG — Drizzle reference creates schema-level dependency
tenantId: integer('tenant_id').references(() => tenants.id),
```

### 4.4 — API handlers are self-contained

Each API handler file must be independently importable. It reads from its own module's schema and calls other modules only via HTTP or EventBus.

---

## Rule 5: Tenant-Scoped and RLS-Protected

Every module that stores tenant-specific data must enforce data isolation at multiple levels.

### 5.1 — Every tenant-scoped table has a `tenantId` column

```typescript
export const kbEntries = pgTable('kb_entries', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),  // REQUIRED for tenant-scoped data
  // ... other fields
}, (table) => [
  index('kb_entries_tenant_id_idx').on(table.tenantId),  // REQUIRED — always index tenantId
]);
```

### 5.2 — API handlers filter by tenant

Every list/get/update/delete handler must filter by `tenantId` when the data is tenant-scoped. The tenant context comes from:
- **Authenticated user's tenant** (from auth middleware → `req.tenantId`)
- **Explicit query parameter** (for admin users with cross-tenant access)
- **URL path parameter** (e.g., `/api/knowledge-base/[tenantSlug]/search`)

```typescript
// In a list handler — ALWAYS filter by tenant
const rows = await db
  .select()
  .from(kbEntries)
  .where(eq(kbEntries.tenantId, tenantId))  // REQUIRED
  .orderBy(desc(kbEntries.createdAt));
```

### 5.3 — RLS policies can be created for any module table

The existing RLS system (visual builder → `rls-compiler.ts` → `CREATE POLICY` SQL) works on any table. Your module tables are eligible for RLS policies that restrict data access based on:

- **Role** (`roles.hierarchyNodeId` scoping)
- **Hierarchy node** (company → group → team → user)
- **Context variables** (`current_setting('app.current_user_id')`, `current_setting('app.current_role')`, `current_setting('app.current_hierarchy_path')`)

### 5.4 — Hierarchy-aware data access

The `hierarchy_nodes` table enables unlimited-depth organizational trees. A module's data can be scoped to any level:

```
Tenant (top level)
  └── Group A (e.g., "Sede Norte")
  │     └── Team 1
  │     └── Team 2
  └── Group B (e.g., "Sede Sur")
        └── Team 3
```

For a group within a tenant to only see its own data, the module table needs a `hierarchyNodeId` column (or the RLS policy uses the `current_hierarchy_path` context variable):

```typescript
// Option A: Direct column — simpler, explicit
export const conversations = pgTable('notification_conversations', {
  tenantId: integer('tenant_id').notNull(),
  hierarchyNodeId: integer('hierarchy_node_id'),  // Optional — for group-level scoping
  // ...
});

// Option B: RLS policy (via visual builder) — no column needed
// Policy: row.tenantId = current_tenant AND row.assignedGroupId IN (current_user_hierarchy_descendants)
```

### 5.5 — Permission-scoped API access

The `api_endpoint_permissions` table maps every API endpoint to a required permission. When `module-auth` middleware runs, it checks:

1. Is the endpoint marked `isPublic`? → Allow without auth
2. Does the authenticated user's role have the required permission? → Allow
3. Otherwise → 403 Forbidden

Your module must register its permissions via seed:

```typescript
// seed.ts
const modulePermissions = [
  { resource: 'kb-entries', action: 'read', slug: 'kb-entries.read' },
  { resource: 'kb-entries', action: 'create', slug: 'kb-entries.create' },
  { resource: 'kb-entries', action: 'update', slug: 'kb-entries.update' },
  { resource: 'kb-entries', action: 'delete', slug: 'kb-entries.delete' },
];
```

### 5.6 — Tenant context in events

When emitting events for tenant-scoped entities, **always include `tenantId` in the payload**. This allows wirings and workflow triggers to condition on tenant:

```typescript
await eventBus.emit('kb.entry.created', {
  id: entry.id,
  tenantId: entry.tenantId,  // REQUIRED
  question: entry.question,
});
```

---

## Rule 6: UX Friendly

Every module's dashboard UI must follow React Admin conventions and integrate smoothly into the existing dashboard.

### 6.1 — Resources follow CRUD convention

Each entity gets a `ResourceConfig` with standard views:

```typescript
resources: [
  {
    name: 'kb-entries',           // URL-safe, kebab-case
    list: KBEntryList,            // Datagrid with filters, sorting, pagination
    create: KBEntryCreate,        // SimpleForm with validated inputs
    edit: KBEntryEdit,            // SimpleForm with existing data
    show: KBEntryShow,            // Detail view with related data
    icon: QuestionAnswerIcon,     // MUI icon
    options: { label: 'FAQ Entries' }
  }
]
```

### 6.2 — Menu items are grouped with section labels

```typescript
menuItems: [
  { label: 'Categories', to: '/kb-categories' },
  { label: 'Entries', to: '/kb-entries' },
]
```

Menu sections are added in `CustomMenu.tsx` with a `<Typography variant="overline">` label and `<Divider>`:

```tsx
<Divider sx={{ my: 1 }} />
<Box sx={{ px: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Knowledge Base
  </Typography>
</Box>
<Menu.ResourceItem name="kb-categories" />
<Menu.ResourceItem name="kb-entries" />
```

### 6.3 — List views support tenant filtering

When the global `TenantSelector` sets an active tenant, list views auto-filter. If no tenant is selected (admin mode), show all with a tenant column:

```tsx
// In list component
const { activeTenantId } = useTenantContext();

<List filter={activeTenantId ? { tenantId: activeTenantId } : undefined}>
  <Datagrid>
    {!activeTenantId && <ReferenceField source="tenantId" reference="tenants" />}
    <TextField source="question" />
    ...
  </Datagrid>
</List>
```

### 6.4 — Create forms auto-assign tenant

When creating a record, the active tenant is auto-set. Users don't manually pick a tenant unless they're a super-admin:

```tsx
const { activeTenantId } = useTenantContext();

<Create transform={(data) => ({ ...data, tenantId: activeTenantId })}>
  <SimpleForm>
    {/* tenantId is hidden, auto-set */}
    <TextInput source="question" isRequired fullWidth />
  </SimpleForm>
</Create>
```

### 6.5 — Custom editors link from edit pages

Complex editors (workflow graph, RLS visual builder, agent playground) are linked from the standard edit page with a toolbar button — following the `WorkflowEdit.tsx` pattern:

```tsx
<Button
  variant="outlined"
  startIcon={<EditNoteIcon />}
  onClick={() => navigate(`/agent-workflows/${record.id}/editor`)}
>
  Visual Editor
</Button>
```

### 6.6 — Show pages include related data

Show pages display the entity plus related information (recent executions, version history, usage stats, related entities from other modules).

### 6.7 — JSONB fields use appropriate editors

| Data Type | Input Component |
|-----------|----------------|
| Tags/arrays | `<TagInput>` or `<ArrayInput>` with `<SimpleFormIterator>` |
| Key-value objects | `<JsonInput>` (code editor) or custom grouped inputs |
| Schedule (day/time) | Custom `<ScheduleEditor>` |
| Rich text | `<RichTextInput>` or `<TextInput multiline>` |
| File reference | `<FileUploadField>` (from module-files) |
| Reference to other entity | `<ReferenceInput>` with `<AutocompleteInput>` |

---

## Rule 7: JSON-First Definitions

Complex structures are stored as JSONB in Postgres and versioned with snapshot tables.

### 7.1 — JSONB for flexible structures

Workflow definitions, agent configs, guardrail rules, RLS policy definitions, channel configs — all stored as `jsonb()` columns. This avoids schema migrations when the definition format evolves.

```typescript
definition: jsonb('definition').notNull(),
agentConfig: jsonb('agent_config'),
guardrailConfig: jsonb('guardrail_config'),
```

### 7.2 — Version history with snapshot tables

Any entity with a `definition` or complex config that changes over time must have a companion `{entity}_versions` table:

```typescript
export const kbEntryVersions = pgTable('kb_entry_versions', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull(),     // FK to main table
  version: integer('version').notNull(),
  question: text('question').notNull(),        // snapshot of all fields
  answer: text('answer').notNull(),
  keywords: jsonb('keywords'),
  description: text('description'),            // optional changelog note
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('kb_ev_entry_id_idx').on(table.entryId),
  unique('kb_ev_unique').on(table.entryId, table.version),
]);
```

### 7.3 — Auto-version on update

PUT handlers must auto-create a version snapshot when the definition changes:

```typescript
// In PUT handler
const existing = await db.select().from(entity).where(eq(entity.id, id));
if (definitionChanged) {
  await db.insert(entityVersions).values({
    entityId: id,
    version: existing.version,
    definition: existing.definition,  // snapshot the OLD version
  });
  // Then update the main record with version + 1
}
```

### 7.4 — Version restore endpoint

Provide `POST /api/{entity}/[id]/versions/[versionId]/restore` to roll back to a previous version.

---

## Rule 8: Config Cascade

Module configuration uses the 5-tier tenant-aware cascade system from `module-config` (see `docs/modules/20-module-config.md`).

### 8.1 — Declare configurable settings

```typescript
configSchema: [
  {
    key: 'MAX_FAQ_ENTRIES',
    type: 'number',
    description: 'Maximum FAQ entries per tenant',
    defaultValue: 100,
    instanceScoped: true,  // can be overridden per tenant/instance
  },
  {
    key: 'EMBEDDING_MODEL',
    type: 'string',
    description: 'Default embedding model for FAQ entries',
    defaultValue: 'text-embedding-3-small',
    instanceScoped: true,
  }
]
```

### 8.2 — Resolution order (5-tier)

1. **Tenant instance override** — `tenantId=T, scope='instance', scopeId=X` (most specific)
2. **Tenant module default** — `tenantId=T, scope='module', scopeId=NULL`
3. **Platform instance override** — `tenantId=NULL, scope='instance', scopeId=X`
4. **Platform module default** — `tenantId=NULL, scope='module', scopeId=NULL`
5. **Schema default** — from `configSchema[].defaultValue` (code-level, least specific)

Resolve a single key via:
```
GET /api/module-configs/resolve?moduleName=knowledge-base&key=MAX_FAQ_ENTRIES&tenantId=5
```

Resolve multiple keys in a single request via:
```
GET /api/module-configs/resolve-batch?moduleName=knowledge-base&tenantId=5&keys=MAX_FAQ_ENTRIES,EMBEDDING_MODEL
```

### 8.3 — Tenant-specific config overrides

The `moduleConfigs` table has a nullable `tenantId` column. Rows with `tenantId = NULL` are platform-global defaults; rows with a specific `tenantId` are tenant-scoped overrides. Each tenant can have different settings (e.g., different embedding model, different limits) without code changes. RLS policies ensure tenants can only read their own overrides plus platform globals.

---

## Rule 9: Event-Driven Integration

Modules integrate with the wider platform through the EventBus and wiring system.

### 9.1 — Emit lifecycle events for all CRUD operations

```
{module}.{entity}.created    — after successful insert
{module}.{entity}.updated    — after successful update
{module}.{entity}.deleted    — after successful delete
```

### 9.2 — Emit domain events for significant state changes

```
notifications.conversation.escalated
notifications.usage.limitExceeded
agents.execution.completed
kb.entry.embedded
```

### 9.3 — Events enable workflow triggers

Any event can be set as a workflow's `triggerEvent`. The wiring runtime auto-executes the workflow when the event fires. Your module doesn't need to know about workflows — it just emits events, and the platform handles the rest.

### 9.4 — Events carry enough context for wirings

Include all fields that a wiring's `condition` or `transform` might need:

```typescript
await eventBus.emit('kb.entry.created', {
  id: 42,
  tenantId: 5,
  categoryId: 3,
  question: "¿Cuál es el horario?",
  language: "es",
  hasEmbedding: false,
});
```

---

## Rule 10: API Design

### 10.1 — Use the shared API utilities

```typescript
import { parseListParams, listResponse, notFound, badRequest } from '@oven/module-registry/api-utils';
```

- `parseListParams(req)` — parses React Admin sort/range/filter query params
- `listResponse(data, resource, params, total)` — builds response with `Content-Range` header
- `notFound()`, `badRequest()` — standard error responses

### 10.2 — Handler file naming convention

| Route Pattern | File Name | HTTP Methods |
|--------------|-----------|-------------|
| `{resource}` | `{resource}.handler.ts` | GET (list), POST (create) |
| `{resource}/[id]` | `{resource}-by-id.handler.ts` | GET, PUT, DELETE |
| `{resource}/[id]/{action}` | `{resource}-{action}.handler.ts` | POST |

### 10.3 — List endpoints return Content-Range

React Admin requires the `Content-Range` header for pagination:

```typescript
export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(table).where(filters).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(table).where(filters),
  ]);
  return listResponse(rows, 'kb-entries', params, Number(count));
}
```

### 10.4 — Error handling uses the error matcher pattern

```typescript
import { withHandler } from '@oven/module-registry/api-errors';

export const POST = withHandler(async (request: NextRequest) => {
  // Your logic — if it throws, withHandler maps known errors to proper HTTP responses
});
```

### 10.5 — Public endpoints must be explicitly marked

By default, all endpoints require authentication. Public endpoints (e.g., chat widget, webhook receivers) must be marked in `api_endpoint_permissions`:

```sql
INSERT INTO api_endpoint_permissions (module, route, method, is_public)
VALUES ('notifications', 'notifications/whatsapp/webhook', 'POST', true);
```

---

## Rule 11: Schema Design

### 11.1 — Table naming

```
{module_prefix}_{entity}             — e.g., kb_entries, notification_channels
{module_prefix}_{entity}_versions    — e.g., kb_entry_versions
```

Use snake_case for table and column names.

### 11.2 — Standard columns

Every table must have:

```typescript
id: serial('id').primaryKey(),
createdAt: timestamp('created_at').defaultNow().notNull(),
updatedAt: timestamp('updated_at').defaultNow().notNull(),
```

Tenant-scoped tables must also have:

```typescript
tenantId: integer('tenant_id').notNull(),
```

### 11.3 — Index requirements

Always index:
- `tenantId` (all tenant-scoped tables)
- Foreign key columns (`categoryId`, `agentId`, etc.)
- `slug` columns (for lookups)
- Columns used in filters (`status`, `enabled`, `channelType`)

### 11.4 — Slug columns are unique

Entities addressable by slug must have `unique()` constraint:

```typescript
slug: varchar('slug', { length: 128 }).notNull().unique(),
```

### 11.5 — Enabled/disabled pattern

Entities that can be toggled without deletion:

```typescript
enabled: boolean('enabled').notNull().default(true),
```

---

## Rule 12: Seed Data

### 12.1 — Seed function is fully idempotent (delete + recreate)

The seed function **must** be safe to run any number of times, always producing the same result. Use the **delete + recreate** pattern for content data, and `onConflictDoNothing` for permissions.

**Strategy by data type:**

| Data Type | Strategy | Why |
|-----------|----------|-----|
| Permissions | `onConflictDoNothing` | Append-only, never changes, unique on `slug` |
| DB extensions/indexes | `IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` | Schema-level, safe to retry |
| Content data (categories, entries, plans, etc.) | **Delete all → re-insert** | Ensures schema changes, new columns, and updated seed data always apply cleanly |

**Delete order must respect foreign keys** (children first):
```
versions → entries → categories → knowledge_bases
quotas → plans → provider_services → services → categories → providers
```

```typescript
// CORRECT: Delete + recreate pattern
export async function seedMyModule(db: any) {
  // 1. Permissions — idempotent via onConflictDoNothing
  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // 2. Content data — delete all, then re-insert fresh
  await db.delete(childTable).where(eq(childTable.tenantId, tenantId));
  await db.delete(parentTable).where(eq(parentTable.tenantId, tenantId));

  const [parent] = await db.insert(parentTable).values({ ... }).returning();
  await db.insert(childTable).values({ parentId: parent.id, ... });

  console.log('[module-name] Seeded N items');
}
```

**Anti-patterns (DO NOT USE):**

```typescript
// BAD: Skip if exists — blocks re-seeding after schema changes
const existing = await db.select().from(table).limit(1);
if (existing.length > 0) return; // ← Never do this

// BAD: Query-then-insert — N+1 queries, race conditions
const existing = await db.select().from(table).where(eq(table.slug, slug));
if (existing.length === 0) {
  await db.insert(table).values({ ... }); // ← No onConflict!
}
```

### 12.2 — Seed system entities with `isSystem: true`

Built-in entities that users shouldn't delete:

```typescript
{ name: 'LLM Node', slug: 'agent.llm', category: 'llm', isSystem: true }
```

### 12.3 — Seed permissions for the module

Always use `onConflictDoNothing` — permissions accumulate across modules and must never duplicate:

```typescript
const perms = [
  { resource: 'kb-entries', action: 'read', slug: 'kb-entries.read', description: 'View FAQ entries' },
  { resource: 'kb-entries', action: 'create', slug: 'kb-entries.create', description: 'Create FAQ entries' },
];
for (const perm of perms) {
  await db.insert(permissions).values(perm).onConflictDoNothing();
}
```

### 12.4 — Seed must log what it does

Every seed function must log its actions so operators can verify:

```typescript
console.log('[module-name] Cleared existing data');
console.log('[module-name] Seeded 10 categories, 15 entries');
```

---

## Rule 13: Config Centralization

Tenant-customizable settings must not live as columns on domain tables. They belong in `module-config`, accessed via the cascade resolution system defined in Rule 8.

### 13.1 — No tenant-customizable columns on domain tables

If a field's value can differ per tenant and is not part of the entity's core identity (i.e., not `id`, `name`, `slug`, `enabled`), it must be stored as a `module-config` entry — not as a column on the domain table.

**Wrong** — business config baked into the identity table:
```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  timezone: varchar('timezone', { length: 100 }),       // ← WRONG: should be in module-config
  tone: varchar('tone', { length: 50 }),                 // ← WRONG
  schedule: jsonb('schedule'),                           // ← WRONG
  whatsappLimit: integer('whatsapp_limit'),               // ← WRONG: usage limit, not identity
});
```

**Right** — slim identity table + config entries:
```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tenant-customizable settings declared in configSchema:
configSchema: [
  { key: 'TIMEZONE', type: 'string', defaultValue: 'America/Bogota', instanceScoped: true },
  { key: 'TONE', type: 'string', defaultValue: 'friendly', instanceScoped: true },
  { key: 'SCHEDULE', type: 'json', defaultValue: null, instanceScoped: true },
]
// Usage limits belong in module-subscriptions (plan_quotas / subscription_quota_overrides)
```

### 13.2 — Declare all settings in `configSchema`

Every module-config key that your module reads at runtime must be declared in the module's `configSchema` array. This enables:
- **Dashboard discoverability** — the config UI auto-generates forms from the schema
- **Validation** — the resolve endpoint can validate types and apply defaults
- **Documentation** — each key has a description visible to platform operators

### 13.3 — Read config via the resolve endpoint at runtime

Do not query the `module_configs` table directly. Always use the cascade resolution API:

```typescript
// Single key
const res = await fetch(`/api/module-configs/resolve?moduleName=tenants&key=TIMEZONE&tenantId=${tenantId}`);
const { value, source } = await res.json();

// Multiple keys (batch)
const res = await fetch(`/api/module-configs/resolve-batch?moduleName=tenants&tenantId=${tenantId}&keys=TIMEZONE,TONE,SCHEDULE`);
const { results } = await res.json();
// results.TIMEZONE.value, results.TONE.value, etc.
```

This ensures the 5-tier cascade (Rule 8.2) is always applied consistently.

### 13.4 — Identity columns are exempt

The following column types are exempt from this rule and should remain on domain tables:
- **Primary key**: `id`
- **Identity**: `name`, `slug`
- **Status**: `enabled`, `status`
- **Metadata**: `metadata` (freeform JSONB for non-configurable internal data)
- **Timestamps**: `createdAt`, `updatedAt`
- **Structural foreign keys**: `tenantId`, `parentId`, `categoryId`

These columns define _what the entity is_, not _how it behaves_. Behavioral/configurable fields go in module-config.

---

## Checklist: Before Merging a New Module

- [ ] Implements `ModuleDefinition` contract fully
- [ ] Registered in `apps/dashboard/src/lib/modules.ts` in dependency order
- [ ] `chat` block declared with `description`, `capabilities`, `actionSchemas`
- [ ] All events listed in `events.emits` with typed `schemas`
- [ ] No direct imports from other module packages (only registry, EventBus, API calls)
- [ ] External integrations use adapter interface + separate packages
- [ ] All tenant-scoped tables have `tenantId` column with index
- [ ] All tenant-scoped API handlers filter by `tenantId`
- [ ] Events include `tenantId` in payload for tenant-scoped entities
- [ ] Permissions seeded for all CRUD operations
- [ ] JSONB definitions have companion `_versions` table
- [ ] PUT handlers auto-create version snapshots
- [ ] List endpoints return `Content-Range` header via `listResponse()`
- [ ] `parseListParams()` used for all list endpoints
- [ ] Menu items added to `CustomMenu.tsx` with section label
- [ ] React Admin resources registered with list/create/edit/show
- [ ] Create forms auto-assign `tenantId` from context
- [ ] List views filter by active tenant
- [ ] Seed function is idempotent
- [ ] Config settings declared in `configSchema` if applicable
- [ ] Tenant-customizable settings stored in `module-config` (not as domain table columns)
- [ ] All configurable settings declared in `configSchema` with type, description, and defaultValue
- [ ] Slug columns have unique constraint
- [ ] Foreign keys are plain integers (no Drizzle `references()`)
- [ ] Public endpoints marked in `api_endpoint_permissions`
