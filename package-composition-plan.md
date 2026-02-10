# Package Composition Plan — Oven Modular System

> **Last Updated**: 2026-02-09
> **Status**: Phase 5 complete (dashboard rendering) — Phase 6+ in progress
> **Pattern**: Package Composition with Module Registry

---

## 1. Vision

Every game feature (maps, players, inventory, combat) is a **self-contained package** that:
- Owns its database schema (Drizzle ORM tables)
- Exposes API route handlers (Next.js compatible)
- Provides React Admin UI components (resources, custom pages)
- Declares dependencies on other modules
- Can be added to any project by importing and registering it

A thin **dashboard shell** (Next.js) imports all registered modules and composes them into a unified admin interface + API.

---

## 2. The Module Contract

Every module exports a single `ModuleDefinition` object:

```typescript
interface ModuleDefinition {
  name: string;                        // "maps", "players", "inventory"
  dependencies?: string[];             // ["maps"] — validated at registration
  schema: Record<string, unknown>;     // Drizzle table definitions
  seed?: (db: DbClient) => Promise<void>;
  resources: ResourceConfig[];         // React Admin CRUD resources
  customRoutes?: CustomRouteConfig[];  // React Admin custom pages
  menuItems?: MenuItemConfig[];        // Sidebar navigation
  apiHandlers: ApiHandlerMap;          // Next.js route handler exports
}
```

---

## 3. Module Registry

Singleton that composes all registered modules:

```
registry.register(mapsModule);      // No dependencies
registry.register(playersModule);   // Depends on "maps"

registry.getComposedSchema();       // All tables merged for drizzle()
registry.getAllResources();          // All React Admin resources
registry.getModule("maps");         // Access specific module
```

Dependency validation: registering a module that depends on an unregistered module throws immediately.

---

## 4. Composition Flow

```
┌─────────────────────────────────────────────────────┐
│  apps/dashboard (Next.js)                           │
│                                                     │
│  ┌─ app/api/tiles/route.ts ────────────────────┐   │
│  │  export { GET, POST } from                  │   │
│  │    '@oven/module-maps/api/tiles.handler';   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ app/(dashboard)/page.tsx ──────────────────┐   │
│  │  <Admin>                                    │   │
│  │    {registry.getAllResources().map(r =>      │   │
│  │      <Resource {...r} />                    │   │
│  │    )}                                       │   │
│  │  </Admin>                                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ lib/db.ts ─────────────────────────────────┐   │
│  │  drizzle(neon(url), {                       │   │
│  │    schema: registry.getComposedSchema()     │   │
│  │  });                                        │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ module- │   │ module- │   │ module- │
    │  maps   │   │ players │   │inventory│
    │         │   │         │   │ (future)│
    │ schema  │   │ schema  │   │         │
    │ api     │   │ api     │   │         │
    │ admin   │   │ admin   │   │         │
    │ types   │   │ types   │   │         │
    └─────────┘   └─────────┘   └─────────┘
```

---

## 5. Monorepo Structure

```
D:\Games\Learning\Oven\
├── docs/
│   └── package-composition.md     # Research: pattern rationale + alternatives
│
├── packages/
│   ├── module-registry/           # @oven/module-registry
│   │   └── src/
│   │       ├── index.ts           # Re-exports
│   │       ├── types.ts           # ModuleDefinition, ResourceConfig, etc.
│   │       ├── registry.ts        # ModuleRegistry singleton
│   │       └── api-utils.ts       # Pagination, sort, filter helpers
│   │
│   ├── module-maps/               # @oven/module-maps
│   │   └── src/
│   │       ├── index.ts           # exports mapsModule: ModuleDefinition
│   │       ├── schema.ts          # tile_definitions, world_configs, maps, map_chunks
│   │       ├── types.ts           # TypeScript types
│   │       ├── seed.ts            # 6 tiles + 1 default config
│   │       ├── api/               # Route handlers (9 files)
│   │       └── admin/             # React Admin components
│   │
│   └── module-players/            # @oven/module-players
│       └── src/
│           ├── index.ts           # exports playersModule: ModuleDefinition
│           ├── schema.ts          # players, player_sessions, player_positions
│           ├── types.ts
│           ├── seed.ts
│           ├── api/               # Route handlers (6 files)
│           └── admin/             # React Admin components
│
├── apps/
│   └── dashboard/                 # Next.js shell (thin)
│       ├── drizzle.config.ts      # Schema: composed from all modules
│       ├── .env.local             # DATABASE_URL
│       └── src/
│           ├── app/
│           │   ├── (dashboard)/page.tsx    # React Admin with composed resources
│           │   └── api/                    # Thin re-export route files (15)
│           ├── lib/
│           │   ├── db.ts                  # Neon + Drizzle
│           │   └── modules.ts             # Register all modules
│           └── providers/
│               └── dataProvider.ts        # React Admin data provider
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── package-composition-plan.md    # This file
├── oven-unity/                    # Unity project (25 C# files)
├── Architecture.md
├── ProgressTracker.md
└── ImplementationPlan.md
```

---

## 6. Database Schema (7 tables across 2 modules)

### Maps Module (4 tables)

**tile_definitions** — Tile types with color, flags, category
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tile_id | smallint UNIQUE | TileData.TileId (0-65535) |
| name | varchar(64) | "Grass", "Water", etc. |
| color_hex | varchar(9) | "#4CAF50FF" |
| flags | smallint | Bitmask: Walkable=1, Swimmable=2, Elevated=4, Transparent=8, Damaging=16, Interactable=32 |
| category | varchar(32) | terrain / decoration / obstacle |
| created_at, updated_at | timestamp | |

**world_configs** — All configurable world parameters
| Column | Type | Default | Maps to (Unity) |
|--------|------|---------|-----------------|
| id | serial PK | | |
| name | varchar(64) UNIQUE | | Config profile name |
| is_active | boolean | false | Only one active |
| chunk_size | integer | 32 | WorldConstants.CHUNK_SIZE |
| load_radius | integer | 2 | RadialChunkLoadingStrategy |
| max_loads_per_frame | integer | 2 | ChunkManager |
| tilemap_pool_size | integer | 30 | TilemapPool |
| terrain_noise_scale | real | 0.05 | ProceduralChunkProvider |
| decoration_noise_scale | real | 0.15 | ProceduralChunkProvider |
| decoration_noise_threshold | real | 0.78 | ProceduralChunkProvider |
| biome_thresholds | jsonb | {"water":0.30,"dirt":0.45,"grass":0.75} | Biome transitions |
| player_move_speed | real | 5.0 | PlayerMovement |
| camera_ortho_size | real | 8.0 | GameBootstrap |
| camera_smooth_speed | real | 10.0 | CameraFollow |
| map_mode | varchar(20) | "discovery" | discovery / ai_generated / prebuilt |
| seed | integer | null | For procedural generation |
| created_at, updated_at | timestamp | | |

**maps** — Named worlds
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar(128) | |
| world_config_id | FK → world_configs | |
| mode | varchar(20) | discovery / ai_generated / prebuilt |
| seed | integer | |
| status | varchar(20) | draft / generating / ready / archived |
| total_chunks | integer | 0 |
| created_at, updated_at | timestamp | |

**map_chunks** — Stored chunk data
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| map_id | FK → maps CASCADE | |
| chunk_x, chunk_y | integer | UNIQUE(map_id, chunk_x, chunk_y) |
| layer_data | bytea | Compressed tile data |
| version | integer | 1 |
| created_at, updated_at | timestamp | |

### Players Module (3 tables)

**players** — Player accounts
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| username | varchar(64) UNIQUE | |
| display_name | varchar(64) | |
| status | varchar(20) | active / banned / inactive |
| total_play_time_seconds | integer | 0 |
| last_seen_at, created_at, updated_at | timestamp | |

**player_sessions** — Game sessions (cross-module FK to maps)
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| player_id | FK → players | |
| map_id | integer | References maps.id |
| started_at, ended_at | timestamp | |
| tiles_traveled, chunks_loaded | integer | |

**player_positions** — Position history (1Hz)
| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | High volume |
| player_id | FK → players | |
| session_id | FK → player_sessions | |
| tile_x, tile_y, chunk_x, chunk_y | integer | |
| world_x, world_y | real | |
| recorded_at | timestamp | Indexed |

---

## 7. API Route Map (15 endpoints)

### Maps Module (9 routes)
| Route | Methods | Purpose |
|-------|---------|---------|
| /api/tiles | GET, POST | List/create tile definitions |
| /api/tiles/[id] | GET, PUT, DELETE | Single tile CRUD |
| /api/world-configs | GET, POST | List/create configs |
| /api/world-configs/[id] | GET, PUT, DELETE | Single config CRUD |
| /api/world-configs/[id]/activate | POST | Set as active config |
| /api/maps | GET, POST | List/create maps |
| /api/maps/[id] | GET, PUT, DELETE | Single map CRUD |
| /api/maps/[id]/chunks | GET, POST | Get/store chunks |
| /api/maps/[id]/generate | POST | Generate map chunks |

### Players Module (6 routes)
| Route | Methods | Purpose |
|-------|---------|---------|
| /api/players | GET, POST | List/create players |
| /api/players/[id] | GET, PUT | Player CRUD |
| /api/players/[id]/positions | GET, POST | Position history |
| /api/sessions | GET | List sessions |
| /api/sessions/[id] | GET | Session details |
| /api/sessions/active | GET | Active sessions |

---

## 8. React Admin Resources

### Maps Module (3 resources + 3 custom pages)
- **tiles** — List with color swatches, Edit with flag checkboxes
- **world-configs** — List, Edit (tabbed: Terrain/Player/Camera), Activate action
- **maps** — List with status chips, Create with mode selector

Custom pages: LiveMapViewer, WorldGenerator, ParameterEditor

### Players Module (2 resources)
- **players** — List (username, status, play time), Show (session history)
- **sessions** — List (duration, tiles traveled), Show (position trail)

---

## 9. Implementation Roadmap (23 steps)

```
Phase 1: Docs + Monorepo + Registry       → Steps 1-5
Phase 2: Maps Module (schema + API)        → Steps 6-10
Phase 3: Players Module (schema + API)     → Steps 11-13
Phase 4: Dashboard composition             → Steps 14-16
Phase 5: React Admin UI                    → Steps 17-19
Phase 6: Unity client integration          → Steps 20-23
```

| # | Step | Location |
|---|------|----------|
| 1 | Create `docs/package-composition.md` (research) | docs/ |
| 2 | Create this plan document | root |
| 3 | Init monorepo (pnpm-workspace.yaml, turbo.json) | root |
| 4 | Create `packages/module-registry/` | module-registry/ |
| 5 | Init `apps/dashboard/` (Next.js + deps) | apps/dashboard/ |
| 6 | Maps module: schema (4 tables) | module-maps/ |
| 7 | Maps module: types + seed | module-maps/ |
| 8 | Maps module: tile API handlers | module-maps/ |
| 9 | Maps module: config API handlers | module-maps/ |
| 10 | Maps module: maps + chunks handlers | module-maps/ |
| 11 | Players module: schema (3 tables) | module-players/ |
| 12 | Players module: player + position handlers | module-players/ |
| 13 | Players module: session handlers | module-players/ |
| 14 | Dashboard: db + module registration | apps/dashboard/ |
| 15 | Dashboard: route re-exports (15 files) | apps/dashboard/ |
| 16 | Dashboard: DataProvider | apps/dashboard/ |
| 17 | Maps: React Admin resources | module-maps/ |
| 18 | Maps: custom pages | module-maps/ |
| 19 | Players: React Admin resources | module-players/ |
| 20 | Unity: ServerTileRegistry.cs | oven-unity/ |
| 21 | Unity: HybridChunkProvider.cs | oven-unity/ |
| 22 | Unity: ServerConfigLoader + PositionReporter | oven-unity/ |
| 23 | Unity: GameBootstrap server mode | oven-unity/ |

**DB migration**: `npx drizzle-kit push` after Step 14.

---

## 10. How to Add a New Module

```
1. Create packages/module-{name}/
2. Define schema.ts with Drizzle tables
3. Create API handlers in api/
4. Create React Admin components in admin/
5. Export ModuleDefinition from index.ts
6. Register in apps/dashboard/src/lib/modules.ts
7. Add route re-export files in apps/dashboard/src/app/api/
8. Run drizzle-kit push for new tables
```

No existing code is modified (except Steps 6-7 which are additive one-liners).

---

## 11. Event Bus — Cross-Module Communication

Modules need to react to events from other modules without tight coupling. Example: when `module-players` creates a player, `module-maps` might auto-create a starting position.

### EventBus (in module-registry)

```typescript
type EventHandler = (payload: unknown) => Promise<void> | void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): () => void;   // returns unsubscribe fn
  emit(event: string, payload: unknown): Promise<void>;   // fires all handlers
  off(event: string, handler: EventHandler): void;
}

export const eventBus = new EventBus();
```

### Module Event Registration

Each module declares events it **emits** and **listens to**:

```typescript
interface ModuleDefinition {
  // ... existing fields ...
  events?: {
    emits: string[];                    // ["player.created", "player.banned"]
    listeners?: Record<string, EventHandler>;  // { "map.generated": handler }
  };
}
```

### Standard Event Naming

`{module}.{entity}.{action}` — e.g. `players.player.created`, `maps.tile.updated`, `maps.config.activated`

---

## 12. Module Install/Uninstall CRUD

The dashboard provides a UI to dynamically enable/disable modules at runtime.

### Module State Table (in module-registry schema)

```sql
CREATE TABLE module_state (
  name        VARCHAR(64) PRIMARY KEY,
  enabled     BOOLEAN DEFAULT true,
  installed_at TIMESTAMP DEFAULT now(),
  config      JSONB DEFAULT '{}'
);
```

### Dashboard Module Manager Page

- **Module List**: Shows all registered modules with enable/disable toggles
- **Install Flow**: Register module → run `drizzle-kit push` for new tables → run seed → enable
- **Uninstall Flow**: Disable module → optionally drop tables → unregister
- **Config Panel**: Per-module JSONB config (module-specific settings)

### API Endpoints

| Route | Methods | Purpose |
|-------|---------|---------|
| /api/modules | GET | List all modules and their state |
| /api/modules/[name] | GET, PUT | Get/update module state |
| /api/modules/[name]/enable | POST | Enable module |
| /api/modules/[name]/disable | POST | Disable module |

---

## 13. Event-State Machine Wiring

The dashboard lets you visually wire module events together, creating an event-state machine where actions in one module trigger responses in others.

### Concept

```
┌──────────────┐    players.player.created    ┌──────────────┐
│   Players    │ ──────────────────────────▶  │     Maps     │
│   Module     │                              │   Module     │
│              │                              │              │
│ emit:        │    maps.config.activated     │ listen:      │
│  player.     │ ◀──────────────────────────  │  auto-assign │
│  created     │                              │  start pos   │
└──────────────┘                              └──────────────┘
```

### Event Wiring Table

```sql
CREATE TABLE event_wirings (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(128),              -- Human-readable name
  source_event VARCHAR(128) NOT NULL,    -- "players.player.created"
  target_action VARCHAR(128) NOT NULL,   -- "maps.assign_start_position"
  enabled     BOOLEAN DEFAULT true,
  transform   JSONB DEFAULT '{}',        -- Payload mapping/transform rules
  conditions  JSONB DEFAULT '{}',        -- Conditions to check before firing
  created_at  TIMESTAMP DEFAULT now()
);
```

### Dashboard Wiring UI

- **Visual Editor**: Drag module events → target module actions
- **Wiring List**: Table of all active wirings with enable/disable
- **Test Mode**: Fire a test event and see which wirings would trigger
- **Audit Log**: Record every event fired and actions triggered

### How It Works (Runtime)

1. Module A emits `players.player.created` with payload `{ id: 1, username: "hero" }`
2. EventBus checks `event_wirings` table for enabled wirings matching `source_event`
3. For each match, applies `transform` to map payload fields
4. Calls the `target_action` handler on the target module
5. Logs the execution to `event_audit_log`

### Low Throughput Strategy

- Wirings are cached in memory (refresh on config change)
- Events are processed synchronously within the same request context
- For high-throughput scenarios: queue to a simple in-process FIFO, process async
- No external message broker needed — this is routing, not a message queue

---

## 14. Updated Implementation Roadmap

```
Phase 1: Docs + Monorepo + Registry       → Steps 1-5    ✅ DONE
Phase 2: Maps Module (schema + API)        → Steps 6-10   ✅ DONE
Phase 3: Players Module (schema + API)     → Steps 11-13  ✅ DONE
Phase 4: Dashboard composition             → Steps 14-16  ✅ DONE
Phase 5: React Admin UI (Guessers)         → Step 17      ✅ DONE
Phase 6: Event Bus                         → Steps 24-26
Phase 7: Module CRUD                       → Steps 27-29
Phase 8: Event-State Machine              → Steps 30-33
Phase 9: Custom React Admin components    → Steps 17-19
Phase 10: Unity client integration        → Steps 20-23
```

| # | Step | Location | Status |
|---|------|----------|--------|
| 24 | EventBus class + types in module-registry | module-registry/ | pending |
| 25 | Add events field to ModuleDefinition | module-registry/ | pending |
| 26 | Wire event listeners at module registration | module-registry/ | pending |
| 27 | module_state table + API handlers | module-registry/ | pending |
| 28 | Module Manager page in dashboard | apps/dashboard/ | pending |
| 29 | Enable/disable module runtime toggling | apps/dashboard/ | pending |
| 30 | event_wirings table in module-registry | module-registry/ | pending |
| 31 | Wiring runtime: load wirings, execute on emit | module-registry/ | pending |
| 32 | Event wiring CRUD API | module-registry/ | pending |
| 33 | Visual wiring editor in dashboard | apps/dashboard/ | pending |

---

## 15. Technical Learnings (From Implementation)

### React Admin + Next.js App Router
- **No Tailwind CSS**: Tailwind v4 `@import "tailwindcss"` conflicts with MUI — breaks all React Admin styles
- **No Turbopack**: `--turbopack` has known issues with dynamic imports in dev mode
- **No basename**: Serve React Admin at root (`/`) not a sub-route — `basename="/dashboard"` causes router mismatch
- **SSR disabled**: Must use `dynamic(() => import('./AdminApp'), { ssr: false })`
- **Catch-all route**: `[[...slug]]/page.tsx` needed for React Admin internal hash routing

### ra-data-simple-rest Query Format
- Sends `sort=["id","ASC"]&range=[0,24]&filter={}` (JSON arrays)
- NOT `_sort=id&_order=ASC&_start=0&_end=25` (that's ra-data-json-server)
- `parseListParams` must handle both formats for flexibility

### Internal Packages (Turborepo)
- Raw `.ts` exports with `transpilePackages` in next.config.ts
- No build step needed — avoids Drizzle ORM branded type bugs in monorepos

---

*This document is the implementation plan. See `docs/package-composition.md` for pattern research and rationale.*
