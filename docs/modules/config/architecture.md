# Module Config -- Architecture

> Patterns, components, and data flow for the platform-wide configuration store.

---

## Design Patterns

Four well-established patterns compose to make Config tractable: Cascade
Resolution (Chain of Responsibility), Table-Owner (Single-Writer), Event-Sourced
Change Notifications, and Schema-Defaulting.

---

### 1. Chain of Responsibility -- 5-Tier Cascade Resolver

The resolver walks a fixed chain of five handlers (tiers) in priority order
and returns as soon as a tier produces a value. The chain is immutable: the
priority list is part of the spec and cannot be reordered per-call.

```
resolve(moduleName, key, tenantId?, scopeId?)
    |
    v
  Tier 1: tenant instance  (tenantId + scopeId)  --[row?]--> return
    |
    v
  Tier 2: tenant module    (tenantId)            --[row?]--> return
    |
    v
  Tier 3: platform instance (scopeId)            --[row?]--> return
    |
    v
  Tier 4: platform module   (NULL tenant)        --[row?]--> return
    |
    v
  Tier 5: schema default (registry.getModule(name).configSchema)
    |
    v
  Not found: { value: null, source: 'default' }
```

**Key invariants**

- Higher tiers always short-circuit lower tiers -- the resolver never reads
  lower-tier rows once a match is found.
- Every returned payload includes a `source` string so callers can audit
  where the value came from.
- Tier 5 is **never persisted** as a row. If a caller wants to "lock in" a
  schema default, they upsert it as a tier-4 row explicitly.

**Why chain-of-responsibility over a single UNION query**

- The UNION would need `ORDER BY (CASE ... END)` on the priority marker and
  `LIMIT 1`, which is slower than short-circuit reads when tier 1 or 2 hits
  (the hot path).
- Explicit tier numbering in code makes priority inversion impossible --
  the chain is auditable line-by-line.
- Query plans stay simple: each tier is a single-index lookup.

---

### 2. Single-Writer Ownership (Table Owner)

`module-config` is the **only** package that may mutate `module_configs`.
Other modules read through the HTTP API. This is a codified rule in
`module-rules.md` Rule 3.1: no direct imports of another module's schema for
write purposes.

**Consequences**

- Sprint-03 removes `moduleConfigs` from `packages/module-workflows/src/schema.ts`,
  ending a historical co-ownership.
- A migration lives under `packages/module-config/src/migrations/` -- not in
  the dashboard, not in `module-workflows`.
- Cross-module FKs pointing at `module_configs.id` would violate Rule 4.3
  (plain integer FKs only) anyway, so single-writer ownership falls out
  naturally.

---

### 3. Event-Sourced Change Notifications

Every mutation emits a typed event on the EventBus:

```
config.entry.created   { id, tenantId, moduleName, key, scope, scopeId }
config.entry.updated   { id, tenantId, moduleName, key, oldValue, newValue }
config.entry.deleted   { id, tenantId, moduleName, key }
```

**Who listens**

- `module-workflows` wiring runtime -- workflows can trigger on config
  changes (e.g. re-generate a schedule cache when `SCHEDULE` updates).
- Dashboard UI -- real-time list refresh via an SSE bridge.
- `module-subscriptions` -- invalidates the credential cache when a provider
  credential key changes.

**Rule 5.6 compliance**: every event payload includes `tenantId` so
wirings can filter by tenant.

---

### 4. Schema-Defaulting via Registry Discovery

Tier 5 of the cascade reads from a module's declared `configSchema` array at
runtime. This keeps the schema default in the same file as the code that
uses the setting, avoiding drift.

```typescript
// packages/module-notifications/src/index.ts
export const notificationsModule: ModuleDefinition = {
  // ...
  configSchema: [
    {
      key: 'DAILY_SEND_LIMIT',
      type: 'number',
      defaultValue: 200,
      description: 'Max outbound messages per tenant per day',
    },
  ],
};
```

The resolver calls `registry.getModule('notifications').configSchema.find(
  e => e.key === 'DAILY_SEND_LIMIT')` at request time -- it does not cache
the schema default. The cost is trivial because the registry is in-process.

---

## Component Map

```
packages/module-config/src/
  index.ts                              ← ModuleDefinition + chat block
  schema.ts                             ← moduleConfigs pgTable + indexes
  types.ts                              ← ConfigEntry, ResolveResult, BatchResolveResult
  seed.ts                               ← permissions seed
  api/
    module-configs.handler.ts           ← GET list / POST upsert
    module-configs-by-id.handler.ts     ← GET + PUT + DELETE single
    module-configs-resolve.handler.ts   ← 5-tier cascade (single key)
    module-configs-resolve-batch.handler.ts ← 5-tier cascade (multi-key)
```

### index.ts (ModuleDefinition)

Declares the module name (`config`), three events, zero `configSchema`
entries (config does not have its own settings), and the three `chat`
actionSchemas (`config.resolve`, `config.resolveBatch`, `config.list`).

### schema.ts (Drizzle table)

Single table `module_configs` with four indexes:

- `module_configs_tenant_idx` on `tenant_id`
- `module_configs_module_idx` on `module_name`
- `module_configs_lookup_idx` on `(module_name, key)`
- `module_configs_tenant_module_idx` on `(tenant_id, module_name)`

The COALESCE unique index is created by a raw-SQL migration (sprint-03)
because Drizzle cannot express it natively.

### api/*.handler.ts

Each file is independently importable and holds a single HTTP-verb surface.
No handler imports any other handler. All handlers call `getDb()` from
`@oven/module-registry/db`.

---

## Data Flow -- Single-Key Resolve

```
1. Client calls GET /api/module-configs/resolve?moduleName=notifications&key=DAILY_SEND_LIMIT&tenantId=42
2. Handler parses params, rejects if moduleName or key missing (400).
3. Tier 1: tenantId=42 + scopeId missing ---> skip.
4. Tier 2: SELECT ... WHERE tenant_id=42 AND module_name='notifications' AND scope='module' AND scope_id IS NULL AND key='DAILY_SEND_LIMIT'
   ├── Hit: return { value: row.value, source: 'tenant-module' }.
   └── Miss: continue.
5. Tier 3: scopeId missing ---> skip.
6. Tier 4: SELECT ... WHERE tenant_id IS NULL AND ... ─── Hit or continue.
7. Tier 5: registry.getModule('notifications').configSchema.find(e => e.key === 'DAILY_SEND_LIMIT')
   ├── Hit: return { value: entry.defaultValue, source: 'schema' }.
   └── Miss: fall through.
8. Not found: return { value: null, source: 'default' }.
```

## Data Flow -- Batch Resolve

```
1. GET /api/module-configs/resolve-batch?moduleName=notifications&keys=A,B,C&tenantId=42
2. Split keys (defensive: trim, filter empty). Reject if result is empty (400).
3. Single tenant-query: SELECT ... WHERE tenant_id=42 AND module_name='notifications' AND key IN (A,B,C).
   For each row, if scope=='module' and scope_id IS NULL ---> results[key] = tenant-module, remove from unresolved set.
4. Platform-query: SELECT ... WHERE tenant_id IS NULL AND key IN (unresolved).
   For each row matching scope=='module' and scope_id IS NULL ---> results[key] = platform-module, remove from unresolved.
5. Schema loop: for each remaining unresolved key, look up in the registry's configSchema.
6. Any key still unresolved ---> results[key] = { value: null, source: 'default' }.
7. Return { results }.
```

The batch resolver intentionally does **not** query tiers 1 or 3 (the
instance tiers) because there is no `scopeId` param. Callers that need
instance overrides call the single-key endpoint per key.

---

## Concurrency & Consistency

- **Reads** are lock-free. The resolver issues N single-row lookups with
  `LIMIT 1` each. All queries use indexes, so each lookup is O(log rows).
- **Writes** go through upsert logic: `SELECT ... LIMIT 1` + `UPDATE` or
  `INSERT`. A concurrent writer race can create duplicate rows in the small
  window before the COALESCE unique index is created (sprint-03). Once the
  index is in place, a concurrent `INSERT` will fail with a unique-violation
  and the caller must retry.
- **Events** are fired synchronously after the DB write returns. If the
  EventBus listener throws, the write is already committed -- listeners
  must be idempotent and non-critical. For critical side effects, use a
  wiring or workflow trigger rather than an in-process listener.

---

## Performance Budget

| Operation | Target | Notes |
|-----------|-------:|-------|
| Single-key resolve (tier-1 hit) | < 5ms p50, < 20ms p95 | 1 indexed lookup |
| Single-key resolve (tier-4 hit) | < 15ms p50, < 40ms p95 | 4 indexed lookups (tiers 1-2 skipped, tier 3 misses) |
| Single-key resolve (tier-5 hit) | < 20ms p50, < 50ms p95 | 4 db lookups + 1 in-process registry call |
| Batch resolve (14 keys) | < 30ms p50, < 80ms p95 | 2 `IN` queries + schema loop |
| Upsert | < 25ms p50 | 1 select + 1 insert/update |

Enforced in integration tests once they land. Unit tests (sprint-01) do not
measure latency.
