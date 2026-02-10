# Player ↔ Map Position Bridge

## Overview

The `module-player-map-position` package is a bridge module that tracks the relationship between players and maps. It answers three key questions:

1. **Which map is this player on?** → `player_map_assignments` table
2. **Where exactly is the player?** → `player_positions` table (high-frequency tracking)
3. **What has the player explored?** → `player_visited_chunks` table (fog of war)

## Architecture

```
module-maps          module-players          module-sessions
     │                     │                       │
     └──────────┬──────────┘                       │
                │                                  │
        module-player-map-position ←───────────────┘
        (bridge module)
```

**Dependencies**: `maps`, `players`, `sessions`

## Tables

### `player_map_assignments`
Tracks which map a player is currently assigned to. Only one assignment per player can be active at a time.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| playerId | integer | FK → players.id |
| mapId | integer | FK → maps.id |
| isActive | boolean | Only one active per player |
| spawnTileX/Y | integer | Where the player spawns on this map |
| currentTileX/Y | integer | Last known position (updated on session end) |
| assignedAt | timestamp | When the player joined this map |
| leftAt | timestamp | When the player left (null if active) |

**Indexes**: `(playerId, isActive)`, unique `(playerId, mapId, isActive)`

### `player_positions`
High-frequency position tracking (1Hz from Unity client). Used for replays, analytics, and heatmaps.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial PK | High-volume table |
| playerId | integer | FK → players.id |
| sessionId | integer | FK → player_sessions.id |
| mapId | integer | FK → maps.id |
| tileX/Y | integer | Tile grid coordinates |
| chunkX/Y | integer | Which chunk the player is in |
| worldX/Y | real | Precise world position (sub-tile) |
| recordedAt | timestamp | When this position was recorded |

**Indexes**: `(playerId, recordedAt)`, `(sessionId)`

### `player_visited_chunks`
Exploration/fog-of-war tracking. Records which chunks a player has visited on each map.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| playerId | integer | FK → players.id |
| mapId | integer | FK → maps.id |
| chunkX/Y | integer | Chunk coordinates |
| firstVisitedAt | timestamp | First time this chunk was seen |
| visitCount | integer | How many times visited |

**Unique**: `(playerId, mapId, chunkX, chunkY)` — upsert increments visitCount

## Events

| Event | Emitted When |
|-------|-------------|
| `position.player.assigned` | POST /map-assignments — player joins a map |
| `position.player.left` | PUT /map-assignments/:id — player leaves a map |
| `position.player.moved` | POST /player-positions — position recorded |
| `position.chunk.visited` | POST /visited-chunks — new chunk visited |

## Event Listeners

| Listens To | Action |
|-----------|--------|
| `sessions.session.started` | Auto-create/activate map assignment |
| `sessions.session.ended` | Update currentTileX/Y on assignment |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/map-assignments` | List all assignments |
| POST | `/api/map-assignments` | Assign player to map |
| GET | `/api/map-assignments/:id` | Get single assignment |
| PUT | `/api/map-assignments/:id` | Update (deactivate) assignment |
| GET | `/api/map-assignments/active` | Get active assignment for player |
| GET | `/api/player-positions` | List positions (filterable by player/session) |
| POST | `/api/player-positions` | Record new position |
| GET | `/api/visited-chunks` | List visited chunks for player+map |
| POST | `/api/visited-chunks` | Mark chunk as visited (upsert) |

## Unity Integration

The Unity client interacts with this module via:

1. **PositionReporter** (`Assets/Scripts/Core/Networking/PositionReporter.cs`): MonoBehaviour that POSTs player position every 1 second
2. **Visited chunk tracking**: Automatically POSTs to `/visited-chunks` when entering a new chunk
3. **Map assignment**: Loaded from `/map-assignments/active` at game start to know which map to load

## Data Flow

```
Unity Player moves → PositionReporter (1Hz)
  → POST /api/player-positions { playerId, sessionId, mapId, tileX/Y, chunkX/Y, worldX/Y }
  → If new chunk: POST /api/visited-chunks { playerId, mapId, chunkX, chunkY }
```
