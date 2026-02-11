# Package Composition — Module System Architecture

> How Oven's modular monorepo composes independent packages into a unified dashboard.
> Last Updated: 2026-02-11

---

## Pattern: Package Composition with Module Registry

Each domain is an independent npm package exporting a `ModuleDefinition`. The dashboard app composes them at startup.

### ModuleDefinition Interface

```typescript
interface ModuleDefinition {
  name: string;
  dependencies?: string[];
  schema?: Record<string, PgTable>;       // Drizzle tables
  seed?: (db: DrizzleClient) => Promise<void>;
  apiHandlers?: Record<string, Handler>;
  events?: EventSchemaMap;                 // Event definitions
  configSchema?: ConfigSchemaEntry[];      // 3-tier config defaults
  resources?: ReactAdminResource[];        // RA CRUD resources
  customRoutes?: ReactAdminCustomRoute[];  // RA custom pages
  menuItems?: MenuItem[];
}
```

---

## Packages (8 total)

| Package | Tables | Handlers | Events | Purpose |
|---------|--------|----------|--------|---------|
| `@oven/module-registry` | 1 | 0 (inline) | — | Core infrastructure: DB, EventBus, API utils, wiring runtime |
| `@oven/module-maps` | 4 | 10 | 9 | Tiles, world configs, maps, chunks, Perlin generation |
| `@oven/module-players` | 1 | 2 | 3 | Player records, status tracking |
| `@oven/module-sessions` | 1 | 3 | 2 | Session lifecycle, start/end/active |
| `@oven/module-player-map-position` | 3 | 5 | 4 | Assignments, 1Hz positions, visited chunks |
| `@oven/module-workflows` | 5 | 15 | 9 | Workflow engine, executions, configs, versioning |
| `@oven/module-workflow-compiler` | — | — | — | Workflow → TypeScript compiler (Handlebars) |
| `@oven/map-editor` | — | — | — | R3F visual tile map editor |

---

## Key Architectural Decisions

### Why Raw TypeScript Exports

Drizzle ORM schemas use branded types with metadata that gets lost during compilation. All packages use:
```json
{ "main": "./src/index.ts" }
```
The consuming Next.js app transpiles them directly.

### Why Thin Route Re-Exports

Next.js App Router doesn't support dynamic route mounting. Each API endpoint is a thin file:
```typescript
// apps/dashboard/src/app/api/tiles/route.ts
import '@/lib/modules';
import '@/lib/db';
export { GET, POST } from '@oven/module-maps/api/tiles.handler';
```

### Why Plain Integer FKs

Cross-module foreign keys use `integer('player_id')` instead of Drizzle `.references()`. This keeps packages independent — no import cycles, no build order dependencies.

### Why EventBus + Wirings

Modules communicate through events, not direct imports:
- **EventBus**: In-memory pub/sub with history log
- **Wirings**: DB-stored rules mapping source events to target actions
- **Workflows**: State machine orchestration for multi-step operations

---

## Schema Composition

All module schemas merge in the dashboard's `drizzle.config.ts`:

```typescript
import { tileDefinitions, worldConfigs, maps, mapChunks } from '@oven/module-maps';
import { players } from '@oven/module-players';
import { playerSessions } from '@oven/module-sessions';
import { playerMapAssignments, playerPositions, playerVisitedChunks } from '@oven/module-player-map-position';
import { workflows, workflowExecutions, nodeExecutions, moduleConfigs, workflowVersions } from '@oven/module-workflows';
import { eventWirings } from '@oven/module-registry';
```

---

## Config System

The `moduleConfigs` table provides a 3-tier config cascade:

```
GET /api/module-configs/resolve?moduleName=sessions&key=SESSION_TTL_SECONDS&scopeId=mapId:1
```

Resolution order:
1. **Instance** — `scope="instance"`, `scopeId="mapId:1"` (per-map override)
2. **Module** — `scope="module"`, `scopeId=null` (module-wide default)
3. **Schema** — `configSchema` in `ModuleDefinition` (code default)

### Seeded Configs

| Module | Key | Default | Description |
|--------|-----|---------|-------------|
| sessions | `SESSION_TTL_SECONDS` | 300 | Idle timeout before session auto-ends |
| sessions | `SESSION_WARNING_SECONDS` | 240 | Warning before TTL |
| maps | `START_CELL_POSITION` | `{"x":16,"y":16}` | Default spawn position for new players |

---

## React Admin Integration

### Critical Rules
- **No Tailwind CSS** — Tailwind v4 breaks MUI styles (produces blank page)
- **No `--turbopack`** — Causes issues with dynamic imports in dev
- **`ssr: false`** — Must use `dynamic(() => import('./AdminApp'), { ssr: false })`
- **Hash routing** — React Admin uses `/#/resource` URLs; catch-all `[[...slug]]/page.tsx` handles this

### Resource Format

All list endpoints return `ra-data-simple-rest` format:
- Sort: `sort=["field","ASC"]` (JSON array)
- Pagination: `range=[0,24]` (inclusive)
- Response: `Content-Range: resources 0-24/100`

All CRUD components are custom (no Guessers): tiles, world-configs, maps, players, sessions, map-assignments, player-positions, workflows, executions, module-configs.
