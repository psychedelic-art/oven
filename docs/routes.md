# API Routes Reference

> Auto-generated route reference for all Oven dashboard modules.
> Base URL: `http://localhost:3000/api`

---

## Maps Module (`@oven/module-maps`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tiles` | List tile definitions (supports sort, range, filter by category/q) |
| POST | `/api/tiles` | Create tile definition |
| GET | `/api/tiles/:id` | Get single tile |
| PUT | `/api/tiles/:id` | Update tile |
| DELETE | `/api/tiles/:id` | Delete tile |
| POST | `/api/tiles/upload` | Upload sprite (multipart/form-data: file + tileId) |
| DELETE | `/api/tiles/upload` | Remove sprite (JSON: { tileId }) |
| GET | `/api/world-configs` | List world configurations |
| POST | `/api/world-configs` | Create world config |
| GET | `/api/world-configs/:id` | Get single config |
| PUT | `/api/world-configs/:id` | Update config |
| DELETE | `/api/world-configs/:id` | Delete config |
| POST | `/api/world-configs/:id/activate` | Set config as active (deactivates others) |
| GET | `/api/maps` | List maps (filter by status, mode, q) |
| POST | `/api/maps` | Create map |
| GET | `/api/maps/:id` | Get single map |
| PUT | `/api/maps/:id` | Update map |
| DELETE | `/api/maps/:id` | Delete map (cascades chunks) |
| GET | `/api/maps/:id/chunks` | List chunks (or get specific: ?chunk_x=&chunk_y=) |
| POST | `/api/maps/:id/chunks` | Upsert chunk data (base64 layerData) |
| POST | `/api/maps/:id/generate` | Trigger map generation |

---

## Players Module (`@oven/module-players`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/players` | List players (filter by status, q) |
| POST | `/api/players` | Create player |
| GET | `/api/players/:id` | Get single player |
| PUT | `/api/players/:id` | Update player |

---

## Sessions Module (`@oven/module-sessions`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sessions` | List sessions (filter by player_id) |
| POST | `/api/sessions` | Start new session (requires playerId + mapId) |
| GET | `/api/sessions/:id` | Get single session |
| PUT | `/api/sessions/:id` | End session (set endedAt, endTileX/Y) |
| GET | `/api/sessions/active` | List active sessions (endedAt IS NULL) |

---

## Player Map Position Module (`@oven/module-player-map-position`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/map-assignments` | List map assignments |
| POST | `/api/map-assignments` | Assign player to map |
| GET | `/api/map-assignments/:id` | Get single assignment |
| PUT | `/api/map-assignments/:id` | Update assignment (deactivate) |
| GET | `/api/map-assignments/active` | Get active assignment (filter by playerId) |
| GET | `/api/player-positions` | List positions (filter by playerId, sessionId) |
| POST | `/api/player-positions` | Record position |
| GET | `/api/visited-chunks` | List visited chunks (filter by playerId, mapId) |
| POST | `/api/visited-chunks` | Mark chunk visited (upsert) |

---

## Registry Module (`@oven/module-registry`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/modules` | List registered modules + metadata |
| GET | `/api/events` | List EventBus event log |
| GET | `/api/event-wirings` | List event wirings |
| POST | `/api/event-wirings` | Create event wiring |
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
