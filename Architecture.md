# OVEN — Real-Time Action RPG on Tile Grid
## Architectural Blueprint

> **Project**: Oven
> **Engine**: Unity 2D URP (Client) + Next.js 15 (REST API + Dashboard)
> **Database**: Neon Postgres (Drizzle ORM)
> **Monorepo**: Turbo + pnpm
> **Last Updated**: 2026-02-11

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [What's Implemented vs Planned](#2-whats-implemented-vs-planned)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Module System](#4-module-system)
5. [Tile System Architecture](#5-tile-system-architecture)
6. [Chunk-Based World](#6-chunk-based-world)
7. [Workflow Engine](#7-workflow-engine)
8. [Unity Client Architecture](#8-unity-client-architecture)
9. [Database Schema](#9-database-schema)
10. [Event System](#10-event-system)
11. [Map Editor](#11-map-editor)
12. [Future: Real-Time Server](#12-future-real-time-server)
13. [References & Resources](#13-references--resources)

---

## 1. High-Level Architecture

The current architecture uses a **REST-first** approach: the Unity client communicates with the Next.js dashboard API for all operations. Real-time features (WebSocket game server) are planned for later phases.

```
┌─────────────────────────────────────────────────────────────────┐
│                        UNITY CLIENT                             │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ Tile/Chunk│ │ Module       │ │  Renderer  │ │  Input      │  │
│  │ Streaming │ │ Manager      │ │ (Tilemap)  │ │  (New Input)│  │
│  └─────┬────┘ └──────┬───────┘ └─────┬──────┘ └──────┬──────┘  │
│        │             │               │                │         │
│  ┌─────┴─────────────┴───────────────┴────────────────┴──────┐  │
│  │               HTTP REST (ApiClient + coroutines)           │  │
│  └────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │   NEXT.JS 15 DASHBOARD   │
              │                          │
              │ ┌──────────────────────┐ │
              │ │  React Admin 5 UI    │ │
              │ │  (MUI + CRUD views)  │ │
              │ ├──────────────────────┤ │
              │ │  REST API (/api/*)   │ │
              │ │  60 routes, 6 modules│ │
              │ ├──────────────────────┤ │
              │ │  Workflow Engine     │ │
              │ │  (state machines)    │ │
              │ ├──────────────────────┤ │
              │ │  EventBus + Wirings  │ │
              │ │  (cross-module)      │ │
              │ └──────────┬───────────┘ │
              └────────────┼─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ NEON        │
                    │ POSTGRES    │
                    │ 15 tables   │
                    │ (Drizzle)   │
                    └─────────────┘
```

---

## 2. What's Implemented vs Planned

### Implemented (Current)

| Layer | Status | Details |
|-------|--------|---------|
| **Dashboard** | Complete | Next.js 15 + React Admin 5 + Drizzle + Neon Postgres |
| **Module System** | Complete | 8 packages, event bus, wiring runtime, 3-tier config |
| **Maps** | Complete | Tiles, world configs, maps, chunks, simplex noise generation |
| **Players** | Complete | Player CRUD, status tracking |
| **Sessions** | Complete | Session lifecycle, workflow-driven spawn/end/resume |
| **Position** | Complete | Map assignments, 1Hz tracking, visited chunks |
| **Workflows** | Complete | Engine, execution, versioning, compiler, 3 seeded workflows |
| **Map Editor** | Complete | R3F canvas, paint/erase/pan, chunk save, generate |
| **Unity Client** | ~90% | 7 modules, chunk streaming, WASD, IMGUI HUD, workflow integration |

### Planned (Future Phases)

| Feature | Status | Notes |
|---------|--------|-------|
| WebSocket Game Server | Not started | Node.js + bitECS for real-time simulation |
| ECS Components | Not started | Movement, Combat, Spells, AI systems |
| Client-Side Prediction | Not started | Depends on WebSocket server |
| Combat System | Not started | Abilities, AoE, damage formulas |
| Authentication | Not started | JWT + session management |
| Vercel Deployment | Not started | Dashboard production deploy |

---

## 3. Monorepo Structure

```
oven/
├── apps/
│   └── dashboard/                  # Next.js 15 + React Admin 5
│       ├── src/app/
│       │   ├── page.tsx            # Root → dynamic import AdminApp (ssr:false)
│       │   ├── [[...slug]]/page.tsx # Catch-all for React Admin hash routing
│       │   └── api/                # 36 route files (thin re-exports from packages)
│       ├── src/components/         # Custom RA views (tiles, maps, players, etc.)
│       ├── src/lib/
│       │   ├── modules.ts          # Module registration & initialization
│       │   └── db.ts               # Drizzle + Neon connection
│       └── drizzle.config.ts       # Schema composition from all modules
│
├── packages/
│   ├── module-registry/            # Core: types, DB, event bus, API utils, wiring runtime
│   ├── module-maps/                # Tiles, world configs, maps, chunks, Perlin generation
│   ├── module-players/             # Player records, status tracking
│   ├── module-sessions/            # Session lifecycle, start/end/active
│   ├── module-player-map-position/ # Assignments, positions, visited chunks
│   ├── module-workflows/           # Engine, execution, configs, versioning, node registry
│   ├── module-workflow-compiler/   # Definition → TypeScript compiler (Handlebars templates)
│   └── map-editor/                 # React Three Fiber visual tile editor
│
├── oven-unity/                     # Unity project (symlinked to C:/Users/HardM/Oven/)
│   └── Assets/Scripts/
│       ├── Core/                   # Agnostic: Tiles, Chunks, Rendering, Networking, World
│       ├── Infrastructure/         # DI (ServiceLocator), Modules, Pooling (TilemapPool)
│       ├── Game/                   # Movement (PlayerMovement, CameraFollow)
│       └── Modules/                # Maps, Players, Sessions, Tiles, UI (GameHUD, UIModule)
│
├── docs/                           # Architecture, routes, module docs
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 4. Module System

Each package exports a `ModuleDefinition` conforming to `@oven/module-registry` types. Modules register schema, API handlers, events, React Admin resources, and config schemas.

### Module Dependency Graph

```
                    map-editor (standalone React lib)
                         │
module-workflow-compiler ─┤
                         │
               module-workflows
                    │
    ┌───────────────┼───────────────┐
    │               │               │
module-maps    module-players   module-sessions
    │               │               │
    └───────────────┼───────────────┘
                    │
        module-player-map-position
                    │
              module-registry (core)
```

### Package Composition Pattern

- Modules export raw TypeScript (`"main": "./src/index.ts"`) — no build step
- Dashboard app composes all schemas in `drizzle.config.ts`
- API routes are thin re-export files: `export { GET, POST } from '@oven/module-maps/api/tiles.handler'`
- Cross-module FKs use plain `integer()` columns (no Drizzle references across packages)
- Events connect modules loosely via EventBus + wirings

### Config System (3-Tier Cascade)

```
Resolution order for moduleConfigs:
  1. Instance override  (scope="instance", scopeId=specificId)
  2. Module default     (scope="module", scopeId=null)
  3. Schema default     (defined in ModuleDefinition.configSchema)
```

---

## 5. Tile System Architecture

### Tile Data Model

```
TileDefinition (server):
├── tileId: smallint (1-65535, unique)
├── name: string
├── colorHex: string (#RRGGBBAA)
├── flags: smallint (bitmask)
├── category: string (terrain, decoration, obstacle)
├── spritePath: string (Vercel Blob URL, optional)
└── description: string

TileFlags (Unity enum, byte):
├── Walkable     = 0x01
├── Swimmable    = 0x02
├── Elevated     = 0x04
├── Transparent  = 0x08
├── Damaging     = 0x10
└── Interactable = 0x20
```

Current tiles: Grass (1, Walkable), Dirt (1, Walkable), Water (2, Swimmable), Stone (5, Walkable+Elevated), Flower (1, Walkable), Rock (0, obstacle)

### Layer System

```
Layer 0: GROUND      — Base terrain (grass, stone, water, sand)
Layer 1: DECORATION  — Props, flowers, rocks
Layer 2: COLLISION   — Walls, obstacles, trigger zones
Layer 3: METADATA    — Spawn points, zone transitions
```

Each tile = 2 bytes (tileId as Uint16). A 32x32 chunk = 2,048 bytes per layer.

### Interface Architecture (Unity Client)

```
ITileRegistry          — Maps tileId → TileBase for rendering
ITileFlagLookup        — Maps tileId → TileFlags for walkability
IChunkProvider         — Loads/unloads ChunkData (ServerChunkProvider for online)
IWorldCoordConverter   — Converts tile ↔ chunk ↔ world coordinates
```

---

## 6. Chunk-Based World

### Chunk Specifications

| Property | Value |
|----------|-------|
| Chunk Size | 32x32 tiles |
| Layers | 4 |
| Raw Size | ~8 KB (4 layers x 2 bytes x 1024 tiles) |
| Encoding | base64 Uint16Array (layerData column) |
| Load Radius | 5x5 chunks (radius 2) = 25 chunks |

### Two Map Modes

| Mode | Behavior |
|------|----------|
| **discovery** | Infinite. Auto-generates chunks via simplex noise on GET if missing |
| **prebuilt** | Bounded. Returns 404 for missing chunks. Editable in map editor |

### Chunk Loading Pipeline (Unity)

```
ChunkManager.ForceLoadAroundPlayer()
  │
  ├─ Calculate 5x5 required chunks (RadialChunkLoadingStrategy)
  ├─ Diff against loaded chunks
  ├─ Request missing via ServerChunkProvider.LoadChunk(coord)
  │     │
  │     ├─ Return empty ChunkData placeholder (synchronous)
  │     ├─ Start async coroutine → GET /api/maps/:id/chunks?chunkX=&chunkY=
  │     ├─ Decode base64 layerData → ChunkData with TileFlags
  │     ├─ Update cache: _cache[coord] = chunkData
  │     └─ Fire OnChunkLoaded → MapsModule increments counter, re-renders
  │
  └─ Unload chunks beyond load radius
```

### Server-Side Generation (Discovery Mode)

When a GET request arrives for a chunk that doesn't exist in a discovery map:
1. Load world config (noise scale, biome thresholds, seed)
2. Generate 32x32 tile grid using simplex-noise
3. Map noise values to tileIds via biome thresholds
4. Encode as base64 Uint16Array
5. Save to DB and return

---

## 7. Workflow Engine

State machine-based orchestration engine for multi-step game operations.

### Architecture

```
Workflow Definition (XState JSON)
  → WorkflowEngine.execute(definition, params)
    → Iterate states sequentially
    → Per state: resolve inputs via $.path expressions
    → Execute invoke task (API call, transform, condition, etc.)
    → Merge output into context
    → Evaluate guards for transition
    → Track in workflow_executions + node_executions
  → Return final context
```

### Node Types

**Core (builtin)**:
- `core.setVariable` — Set value on context
- `core.transform` — Map values via $.path expressions
- `core.resolveConfig` — 3-tier config cascade lookup
- `core.emit` — Fire event on EventBus
- `core.sql` — Raw SQL execution
- `core.log` — Debug logging
- `core.delay` — Wait N milliseconds

**Dynamic (from module APIs)**:
- `sessions.getActive` — GET /api/sessions/active
- `sessions.create` — POST /api/sessions
- `sessions.update` — PUT /api/sessions/[id]
- `positions.assignments.getActive` — GET /api/map-assignments/active
- `positions.assignments.create` — POST /api/map-assignments
- `positions.assignments.update` — PUT /api/map-assignments/[id]
- *(all module API endpoints auto-registered)*

### Transform Language

```
$.playerId          → context.playerId
$.0.id              → context["0"].id (array spread: first element)
$.checkActive_output → output of "checkActive" node
```

API array responses spread as `{0: item, 1: item, length: N}` in context. Single objects spread normally.

### Seeded Workflows

| Workflow | Slug | Trigger | Purpose |
|----------|------|---------|---------|
| Player Spawn | `player-spawn` | Manual (from Unity) | End old session → check last position → spawn at last pos or config default → create session + assignment |
| Session End | `session-end` | Manual (from Unity) | Update session endedAt → update assignment position → emit event |
| Session Resume | `session-resume` | Manual (from Unity) | Check active session → extract context → get assignment |

---

## 8. Unity Client Architecture

### Module Manager

7 modules initialized in dependency order: `core → networking → tiles → players → sessions → maps → ui`

```
ModuleManager
  ├─ CoreModule          — WorldCoordConverter, TilemapPool registration
  ├─ NetworkingModule    — Server URL configuration
  ├─ TilesModule         — Fetch tile definitions, create ServerTileRegistry + TileFlagLookup
  ├─ PlayersModule       — Fetch player data (hardcoded playerId=1 for now)
  ├─ SessionsModule      — Workflow execution (spawn, end, resume) via polling
  ├─ MapsModule          — Map listing, world creation/destruction, chunk management
  └─ UIModule            — State machine game flow, IMGUI rendering
```

### Game Flow (UIModule State Machine)

```
Initializing → LoadingPlayer → CheckingResume
  │                                    │
  │                    ┌───────────────┤
  │                    ▼               ▼
  │              Resume Session   Map Selection
  │                    │               │
  │                    ▼               ▼
  │              LoadingWorld      Spawning (workflow)
  │                    │               │
  │                    ▼               ▼
  │              Playing ◄──────── LoadingWorld
  │                    │
  │                    ▼ (ESC or TTL)
  │              EndingSession (workflow)
  │                    │
  └────────────────────┘ (loop to MapSelection)
```

### Key Components

| Script | Purpose |
|--------|---------|
| `UIModule.cs` | Game flow coroutine, state transitions |
| `GameHUD.cs` | IMGUI rendering for all states (MonoBehaviour) |
| `MapsModule.cs` | World lifecycle, chunk loading, position tracking |
| `SessionsModule.cs` | Workflow execution with polling, spawn/end/resume |
| `PlayerMovement.cs` | WASD + arrow keys via New Input System, walkability checks |
| `ServerChunkProvider.cs` | Async chunk fetching, base64 decode, cache management |
| `PositionReporter.cs` | 1Hz position reporting to server |
| `ChunkVisitTracker.cs` | Fog-of-war chunk tracking |
| `SessionHeartbeat.cs` | Idle detection, session expiry TTL |
| `DebugHUD.cs` | Developer overlay (position, chunks, FPS) |

### Workflow Integration

Unity communicates with the workflow engine via REST:
1. `POST /api/workflows/:id/execute` with `{ params: { playerId, mapId, ... } }`
2. Poll `GET /api/workflow-executions/:id` every 2s until `status == "completed"`
3. Extract result from `execution.context` (spawnX, spawnY, sessionId, assignmentId)

---

## 9. Database Schema

### Tables by Module

**module-maps** (4 tables):
- `tile_definitions` — tileId, name, colorHex, flags, category, spritePath
- `world_configs` — noise parameters, biome thresholds, player/camera settings
- `maps` — name, mode (discovery/prebuilt), status, bounds, worldConfigId
- `map_chunks` — mapId, chunkX, chunkY, layerData (base64), version

**module-players** (1 table):
- `players` — username, displayName, status, totalPlayTimeSeconds, lastSeenAt

**module-sessions** (1 table):
- `player_sessions` — playerId, mapId, startedAt, endedAt, start/end tile, stats

**module-player-map-position** (3 tables):
- `player_map_assignments` — playerId, mapId, isActive, spawn/current tile
- `player_positions` — high-frequency tracking (playerId, sessionId, tile/chunk/world coords)
- `player_visited_chunks` — fog of war (playerId, mapId, chunkX, chunkY, visitCount)

**module-workflows** (5 tables):
- `workflows` — name, slug, definition (JSONB), triggerEvent, version
- `workflow_executions` — status, context (JSONB), currentState, timing
- `node_executions` — per-node tracking (input, output, duration)
- `module_configs` — 3-tier config cascade (moduleName, scope, scopeId, key, value)
- `workflow_versions` — version history with full definition snapshots

**module-registry** (1 table):
- `event_wirings` — source event → target module action

**Total: 15 tables**

---

## 10. Event System

### EventBus

Centralized pub/sub with in-memory log. Modules emit events; wirings and listeners react.

### All Events

| Module | Event | Payload |
|--------|-------|---------|
| maps | `maps.tile.created` | id, tileId, name, colorHex, flags, category |
| maps | `maps.tile.updated` | id, tileId, name, colorHex, flags, category |
| maps | `maps.tile.deleted` | id, name |
| maps | `maps.config.created` | id, name, isActive, mapMode |
| maps | `maps.config.updated` | id, name, isActive, mapMode |
| maps | `maps.config.activated` | id, name, isActive, previousActiveId |
| maps | `maps.map.created` | id, name, mode, status, worldConfigId, seed |
| maps | `maps.map.deleted` | id, name |
| maps | `maps.map.generated` | id, name, status, totalChunks |
| players | `players.player.created` | id, username, displayName, status |
| players | `players.player.updated` | id, username, displayName, status |
| players | `players.player.banned` | id, username, status |
| sessions | `sessions.session.started` | id, playerId, mapId, startedAt, startTileX/Y |
| sessions | `sessions.session.ended` | id, playerId, mapId, endedAt, endTileX/Y, stats |
| position | `position.player.assigned` | playerId, mapId, spawnTileX/Y |
| position | `position.player.left` | playerId, mapId, currentTileX/Y |
| position | `position.player.moved` | playerId, sessionId, mapId, tile/chunk/world coords |
| position | `position.chunk.visited` | playerId, mapId, chunkX/Y, visitCount |
| workflows | `workflows.workflow.created/updated/deleted` | id, name, slug |
| workflows | `workflows.execution.started/completed/failed` | executionId, context/error |
| workflows | `workflows.node.started/completed/failed` | executionId, nodeId, output/error |

---

## 11. Map Editor

React Three Fiber-based visual editor for tile maps, embedded in the dashboard at `/#/maps/:id/editor`.

### Components

```
MapEditor (orchestrator)
  ├─ TileMapCanvas     — Orthographic R3F canvas, camera controls
  ├─ TilePalette       — Tile selector from server definitions
  ├─ EditorToolbar     — Tool buttons (paint, erase, pan)
  ├─ ChunkMesh         — Per-chunk mesh with DataTexture (GPU rendering)
  ├─ PaintLayer        — Mouse interaction → tile placement
  └─ CursorHighlight   — Hover indicator

useMapEditor hook      — State management (chunks, selection, zoom, dirty tracking)
```

### Chunk Encoding

- Server stores `layerData` as base64-encoded Uint16Array
- Editor decodes to `Uint16Array(1024)` for in-memory editing
- Dirty chunks tracked and saved on explicit save action
- "Generate Discovery Chunks" button for Perlin noise filling

---

## 12. Future: Real-Time Server

The original architecture document planned for a Node.js WebSocket game server with bitECS. This remains the long-term goal:

- **Fixed-timestep game loop** (20-30 Hz) with ECS systems
- **Client-side prediction** with server reconciliation
- **Binary protocol** for movement, combat, abilities
- **Spatial hashing** for interest management (AOI)
- **Redis** for cross-server coordination, chunk caching
- **Combat system**: abilities, AoE patterns, status effects, damage formulas

See the original design notes in commit history for detailed specifications.

---

## 13. References & Resources

### Architecture & Patterns
| Resource | URL |
|----------|-----|
| Fix Your Timestep! | https://gafferongames.com/post/fix_your_timestep/ |
| Colyseus Framework | https://github.com/colyseus/colyseus |
| bitECS | https://github.com/NateTheGreatt/bitECS |
| Turborepo Internal Packages | https://turbo.build/repo/docs/guides/tools/typescript#internal-packages |

### Tile Systems & Worlds
| Resource | URL |
|----------|-----|
| Grids and Coordinates (Red Blob) | https://www.redblobgames.com/grids/ |
| Minecraft Chunk Format | https://minecraft.wiki/w/Chunk |
| Millions of Tiles (Unity) | https://discussions.unity.com/t/best-way-to-handle-millions-of-tiles/826950 |

### Networking (Future)
| Resource | URL |
|----------|-----|
| Client-Side Prediction (Gambetta) | https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html |
| Snapshot Interpolation (SnapNet) | https://snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/ |

### Database
| Resource | URL |
|----------|-----|
| Neon Postgres Docs | https://neon.com/docs |
| Drizzle ORM | https://orm.drizzle.team |

---

*This document reflects the actual implementation as of 2026-02-11. Update it as the project evolves.*
