# Module Config -- Module Design

> The `ModuleDefinition` shape, type contracts, and wiring details for
> `@oven/module-config`.
> Authoritative implementation: `packages/module-config/src/index.ts`.

---

## ModuleDefinition

```typescript
import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { configSchema } from './schema';
import { seedConfig } from './seed';
import * as moduleConfigsHandler from './api/module-configs.handler';
import * as moduleConfigsByIdHandler from './api/module-configs-by-id.handler';
import * as resolveHandler from './api/module-configs-resolve.handler';
import * as resolveBatchHandler from './api/module-configs-resolve-batch.handler';

const eventSchemas: EventSchemaMap = {
  'config.entry.created': {
    id:         { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId:   { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name',        required: true },
    key:        { type: 'string', description: 'Config key',         required: true },
    scope:      { type: 'string', description: 'Config scope (module/instance)' },
    scopeId:    { type: 'string', description: 'Instance scope ID' },
  },
  'config.entry.updated': {
    id:         { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId:   { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name',        required: true },
    key:        { type: 'string', description: 'Config key',         required: true },
    oldValue:   { type: 'any',    description: 'Previous value' },
    newValue:   { type: 'any',    description: 'New value' },
  },
  'config.entry.deleted': {
    id:         { type: 'number', description: 'Config entry DB ID', required: true },
    tenantId:   { type: 'number', description: 'Tenant ID (null for platform-global)' },
    moduleName: { type: 'string', description: 'Module name',        required: true },
    key:        { type: 'string', description: 'Config key',         required: true },
  },
};

export const configModule: ModuleDefinition = {
  name: 'config',
  dependencies: [],
  description:
    'Platform-wide configuration store with tenant-aware 5-tier cascade resolution',
  capabilities: [
    'store module config entries',
    'resolve config with cascade',
    'batch resolve multiple keys',
    'tenant-scoped config isolation',
  ],
  schema: configSchema,
  seed: seedConfig,
  resources: [
    { name: 'module-configs', options: { label: 'Module Configs' } },
  ],
  menuItems: [
    { label: 'Configs', to: '/module-configs' },
  ],
  apiHandlers: {
    'module-configs':          { GET: moduleConfigsHandler.GET, POST: moduleConfigsHandler.POST },
    'module-configs/[id]':     {
      GET:    moduleConfigsByIdHandler.GET,
      PUT:    moduleConfigsByIdHandler.PUT,
      DELETE: moduleConfigsByIdHandler.DELETE,
    },
    'module-configs/resolve':        { GET: resolveHandler.GET },
    'module-configs/resolve-batch':  { GET: resolveBatchHandler.GET },
  },
  configSchema: [], // config does not have its own config
  events: {
    emits: [
      'config.entry.created',
      'config.entry.updated',
      'config.entry.deleted',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description:
      'Platform-wide configuration store. Manages module settings with a 5-tier tenant-aware cascade: tenant instance > tenant module > platform instance > platform module > schema default.',
    capabilities: [
      'list config entries',
      'resolve config value',
      'batch resolve config values',
      'update config entry',
    ],
    actionSchemas: [
      // config.resolve, config.resolveBatch, config.list (see api.md)
    ],
  },
};
```

---

## TypeScript Contracts

```typescript
// packages/module-config/src/types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { moduleConfigs } from './schema';

export type ConfigEntry    = InferSelectModel<typeof moduleConfigs>;
export type NewConfigEntry = InferInsertModel<typeof moduleConfigs>;

export type ConfigScope = 'module' | 'instance';

export type ConfigSource =
  | 'tenant-instance'
  | 'tenant-module'
  | 'platform-instance'
  | 'platform-module'
  | 'schema'
  | 'default';

export interface ResolveResult {
  key: string;
  value: unknown;
  source: ConfigSource;
  tenantId: number | null;
  scopeId: string | null;
}

export interface BatchResolveResult {
  results: Record<string, { value: unknown; source: ConfigSource }>;
}
```

All type-only imports in consumers MUST use `import type` (root `CLAUDE.md`).

---

## Consumer Patterns

### Single-key read, non-hot path

```typescript
// any consumer
const res = await fetch(
  `/api/module-configs/resolve?moduleName=notifications&key=DAILY_SEND_LIMIT&tenantId=${tenantId}`
);
const { value, source }: ResolveResult = await res.json();
```

### Batch read, hot path (portal bootstrap)

```typescript
// apps/dashboard/src/app/api/public-tenants/[slug]/config/route.ts
const res = await fetch(
  `/api/module-configs/resolve-batch?moduleName=tenants&keys=${keys.join(',')}&tenantId=${tenantId}`
);
const { results }: BatchResolveResult = await res.json();
```

### Declarative schema default

```typescript
// packages/module-notifications/src/index.ts
configSchema: [
  {
    key: 'DAILY_SEND_LIMIT',
    type: 'number',
    defaultValue: 200,
    description: 'Outbound message cap per tenant per day',
  },
],
```

At runtime the resolver will return `{ value: 200, source: 'schema' }` when
no tenant override exists.

---

## Registration Order

Config has zero dependencies, so it registers first in
`apps/dashboard/src/lib/modules.ts`:

```typescript
registry.register(configModule);          // MUST be first (well, after core infra)
registry.register(tenantsModule);          // depends on: config
registry.register(authModule);             // depends on: roles
registry.register(aiModule);                // depends on: config, subscriptions, files
// ...
registry.register(workflowsModule);         // AFTER sprint-03: depends on config
```

Sprint-03 switches `workflowsModule` from owning `module_configs` to
depending on `configModule`.

---

## Wiring

Config does not register any wirings of its own. It emits events that other
modules' wirings can listen to:

- `module-subscriptions` subscribes to `config.entry.updated` to invalidate
  the credential cache when a tenant updates their provider SID.
- `module-notifications` subscribes to `config.entry.updated` to reset
  channel adapter instances when API credentials change.

These wirings live in the consuming module's `events.listeners` block (or
in `event_wirings` rows managed via the wiring editor).

---

## Testing Hooks

- **Unit**: mock `@oven/module-registry/db`, `@oven/module-registry`, and
  `drizzle-orm` per the pattern in
  `packages/module-ai/src/__tests__/tool-registry.test.ts`.
- **Integration**: Neon preview branch + real schema migration; asserts
  RLS policies and upsert concurrency.
- **Dashboard smoke**: walk the CRUD flow end-to-end with a seeded row.

Unit tests are the sprint-01 deliverable.
