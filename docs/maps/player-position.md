# Player Map Position Module

> Bridge module connecting players, maps, and sessions with position tracking.
> Package: `@oven/module-player-map-position`
> Last Updated: 2026-02-11

---

## Overview

This module tracks:
1. **Which map** a player is on (assignments)
2. **Where** they are right now (positions, 1Hz)
3. **What they've explored** (visited chunks / fog of war)

---

## Tables

### player_map_assignments

Tracks the active player-map binding. Only one active assignment per player at a time.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| playerId | integer | Cross-module FK to players.id |
| mapId | integer | Cross-module FK to maps.id |
| isActive | boolean | Only one active per player |
| spawnTileX | integer | Where player spawned (default 0) |
| spawnTileY | integer | |
| currentTileX | integer | Last known position (nullable) |
| currentTileY | integer | Updated on session end |
| assignedAt | timestamp | |
| leftAt | timestamp | Set when deactivated |

**Index**: `(playerId, isActive)` for fast active lookup.

### player_positions

High-frequency tracking table. Unity client POSTs every 1 second.

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | High volume expected |
| playerId | integer | |
| sessionId | integer | Links to playerSessions.id |
| mapId | integer | |
| tileX, tileY | integer | Tile grid coordinates |
| chunkX, chunkY | integer | Chunk coordinates |
| worldX, worldY | real | Unity world position (float) |
| recordedAt | timestamp | Server time on insert |

**Indexes**: `(playerId, recordedAt)`, `(sessionId)`

### player_visited_chunks

Fog of war / exploration tracking. Upsert increments visit count.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| playerId | integer | |
| mapId | integer | |
| chunkX, chunkY | integer | |
| firstVisitedAt | timestamp | |
| visitCount | integer | Incremented on each visit |

**Unique index**: `(playerId, mapId, chunkX, chunkY)`

---

## API Handlers (5 files)

| Method | Route | Handler | Notes |
|--------|-------|---------|-------|
| GET | `/api/map-assignments` | assignments.handler | List with pagination |
| POST | `/api/map-assignments` | assignments.handler | Create assignment |
| GET | `/api/map-assignments/:id` | assignments-by-id.handler | |
| PUT | `/api/map-assignments/:id` | assignments-by-id.handler | Update currentTile, isActive |
| GET | `/api/map-assignments/active` | assignments-active.handler | **Returns single object or null** (not array) when filtered by playerId |
| GET | `/api/player-positions` | positions.handler | Filter by playerId, sessionId, mapId |
| POST | `/api/player-positions` | positions.handler | Record position (1Hz) |
| GET | `/api/visited-chunks` | visited-chunks.handler | Filter by playerId, mapId |
| POST | `/api/visited-chunks` | visited-chunks.handler | Upsert (increment visitCount) |

### Important: assignments/active Returns Single Object

When `GET /api/map-assignments/active?filter={"playerId":1}` is called:
- If found: returns the **single assignment object** (not wrapped in array)
- If not found: returns `null`

This is different from other list endpoints. The workflow engine must handle this accordingly (no `$.0.id` — use `$.id` directly).

---

## Events (4 emitted)

| Event | Trigger | Payload |
|-------|---------|---------|
| `position.player.assigned` | POST /api/map-assignments | playerId, mapId, isActive, spawnTileX/Y, assignedAt |
| `position.player.left` | PUT assignment (isActive=false) | playerId, mapId, isActive, leftAt, currentTileX/Y |
| `position.player.moved` | POST /api/player-positions | playerId, sessionId, mapId, tileX/Y, chunkX/Y, worldX/Y, recordedAt |
| `position.chunk.visited` | POST /api/visited-chunks | playerId, mapId, chunkX/Y, firstVisitedAt, visitCount |

---

## Unity Integration

### PositionReporter (MonoBehaviour)

Attached to the Player GameObject. Reports position every 1 second.

```
Configure(serverUrl, playerId, sessionId, mapId, assignmentId)
Update():
  - Track current tile, increment tilesTraveled on change
  - Every 1s: POST /api/player-positions with tile/chunk/world coords
```

**Important**: Uses `CultureInfo.InvariantCulture` for float formatting to avoid locale issues (comma vs period decimal separator).

### ChunkVisitTracker (MonoBehaviour)

Attached to the Player GameObject. Tracks fog-of-war chunk visits.

```
Configure(serverUrl, playerId, mapId)
Update():
  - Track current chunk
  - On chunk change: POST /api/visited-chunks (upsert)
```

---

## Workflow Integration

The `player-spawn` workflow creates assignments:
1. `positions.assignments.getActive` — check if player has active assignment
2. If exists: read `currentTileX/Y` for "last position" spawn
3. `positions.assignments.create` — create new assignment with spawn position

The `session-end` workflow updates assignments:
1. `positions.assignments.update` — set `currentTileX/Y` to final position

The `session-resume` workflow reads assignments:
1. `positions.assignments.getActive` — get active assignment for session context
