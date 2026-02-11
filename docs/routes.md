# API Routes Reference

> Complete route reference for all Oven dashboard modules.
> Base URL: `http://localhost:3000/api`
> Last Updated: 2026-02-11

---

## Maps Module (`@oven/module-maps`)

### Tiles

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tiles` | List tile definitions (filter by category, q) |
| POST | `/api/tiles` | Create tile definition |
| GET | `/api/tiles/:id` | Get single tile |
| PUT | `/api/tiles/:id` | Update tile |
| DELETE | `/api/tiles/:id` | Delete tile |
| POST | `/api/tiles/upload` | Upload sprite (multipart/form-data: file + tileId) → Vercel Blob |
| DELETE | `/api/tiles/upload` | Remove sprite (JSON: `{ tileId }`) |

### World Configs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/world-configs` | List world configurations |
| POST | `/api/world-configs` | Create world config |
| GET | `/api/world-configs/:id` | Get single config |
| PUT | `/api/world-configs/:id` | Update config |
| DELETE | `/api/world-configs/:id` | Delete config |
| POST | `/api/world-configs/:id/activate` | Set config as active (deactivates all others) |

### Maps & Chunks

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/maps` | List maps (filter by status, mode, q) |
| POST | `/api/maps` | Create map |
| GET | `/api/maps/:id` | Get single map |
| PUT | `/api/maps/:id` | Update map (name, status, bounds, etc.) |
| DELETE | `/api/maps/:id` | Delete map (cascades chunks) |
| GET | `/api/maps/:id/chunks` | Get chunks (filter: `?chunkX=&chunkY=`). Discovery mode auto-generates missing chunks via simplex noise |
| POST | `/api/maps/:id/chunks` | Upsert chunk data (base64 layerData). Uses `onConflictDoUpdate` |
| POST | `/api/maps/:id/generate` | Trigger bulk map generation |

**Events emitted**: `maps.tile.created`, `maps.tile.updated`, `maps.tile.deleted`, `maps.config.created`, `maps.config.updated`, `maps.config.activated`, `maps.map.created`, `maps.map.deleted`, `maps.map.generated`

---

## Players Module (`@oven/module-players`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/players` | List players (filter by status, q) |
| POST | `/api/players` | Create player |
| GET | `/api/players/:id` | Get single player |
| PUT | `/api/players/:id` | Update player (no DELETE — only deactivate via status) |

**Events emitted**: `players.player.created`, `players.player.updated`, `players.player.banned`

---

## Sessions Module (`@oven/module-sessions`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sessions` | List sessions (filter by playerId, mapId) |
| POST | `/api/sessions` | Start new session (requires `playerId` + `mapId`) |
| GET | `/api/sessions/:id` | Get single session |
| PUT | `/api/sessions/:id` | Update session. Special: `endedAt: "now"` → `new Date()` |
| GET | `/api/sessions/active` | List active sessions (`endedAt IS NULL`), filter by `playerId` |

**Events emitted**: `sessions.session.started`, `sessions.session.ended`

**Config keys**: `SESSION_TTL_SECONDS` (default 300), `SESSION_WARNING_SECONDS` (default 240)

---

## Player Map Position Module (`@oven/module-player-map-position`)

### Map Assignments

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/map-assignments` | List map assignments |
| POST | `/api/map-assignments` | Assign player to map (auto-deactivates previous) |
| GET | `/api/map-assignments/:id` | Get single assignment |
| PUT | `/api/map-assignments/:id` | Update assignment (currentTileX/Y, isActive) |
| GET | `/api/map-assignments/active` | Get active assignment. Filter by `playerId` → returns **single object** (not array) or `null` |

### Position Tracking

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/player-positions` | List positions (filter by playerId, sessionId, mapId) |
| POST | `/api/player-positions` | Record position (1Hz from Unity client) |

### Visited Chunks (Fog of War)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/visited-chunks` | List visited chunks (filter by playerId, mapId) |
| POST | `/api/visited-chunks` | Mark chunk visited (upsert: increments visitCount) |

**Events emitted**: `position.player.assigned`, `position.player.left`, `position.player.moved`, `position.chunk.visited`

---

## Workflows Module (`@oven/module-workflows`)

### Workflows

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get single workflow (includes definition JSON) |
| PUT | `/api/workflows/:id` | Update workflow (auto-increments version, creates version history) |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow (body: `{ params }` merged into initial context) |
| POST | `/api/workflows/:id/compile` | Compile workflow definition to TypeScript |

### Workflow Versions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflows/:id/versions` | List version history for a workflow |
| GET | `/api/workflows/:id/versions/:versionId` | Get specific version |
| POST | `/api/workflows/:id/versions/:versionId/restore` | Restore workflow to a previous version |

### Executions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflow-executions` | List executions (filter by workflowId, status) |
| GET | `/api/workflow-executions/:id` | Get execution detail (includes `context`, `nodes[]` with I/O) |
| POST | `/api/workflow-executions/:id/cancel` | Cancel running execution |

### Module Configs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/module-configs` | List all configs |
| POST | `/api/module-configs` | Upsert config. Unique: `(moduleName, scope, scopeId, key)` |
| GET | `/api/module-configs/:id` | Get single config |
| PUT | `/api/module-configs/:id` | Update config value |
| DELETE | `/api/module-configs/:id` | Delete config |
| GET | `/api/module-configs/resolve` | Resolve config with 3-tier cascade: `?moduleName=&key=&scopeId=` → instance > module > schema default |

### Node Types

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/node-types` | List all registered workflow node types (builtin + dynamic API nodes) |

**Events emitted**: `workflows.workflow.created/updated/deleted`, `workflows.execution.started/completed/failed`, `workflows.node.started/completed/failed`

---

## Registry Module (`@oven/module-registry`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/modules` | List registered modules + metadata |
| GET | `/api/events` | List EventBus event log (recent emissions) |
| POST | `/api/events` | Emit a test event (for Module Manager UI) |
| GET | `/api/event-wirings` | List event wirings |
| POST | `/api/event-wirings` | Create event wiring (source event → target action) |
| GET | `/api/event-wirings/:id` | Get single wiring |
| PUT | `/api/event-wirings/:id` | Update wiring |
| DELETE | `/api/event-wirings/:id` | Delete wiring |

---

## Query Parameters

All list endpoints support React Admin's `ra-data-simple-rest` format:

- **Sort**: `sort=["field","ASC"]`
- **Pagination**: `range=[0,24]` (inclusive, returns Content-Range header)
- **Filter**: `filter={"q":"search","status":"active"}`

The `Content-Range` header is returned for all list responses:
```
Content-Range: resources 0-24/100
```

---

## Route Statistics

| Module | Routes | Handlers | Tables |
|--------|--------|----------|--------|
| module-maps | 17 | 10 | 4 (tiles, worldConfigs, maps, mapChunks) |
| module-players | 4 | 2 | 1 (players) |
| module-sessions | 5 | 3 | 1 (playerSessions) |
| module-player-map-position | 9 | 5 | 3 (assignments, positions, visitedChunks) |
| module-workflows | 18 | 15 | 5 (workflows, executions, nodeExecutions, moduleConfigs, versions) |
| module-registry | 7 | 0 (inline) | 1 (eventWirings) |
| **Total** | **60** | **35** | **15** |
