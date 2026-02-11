# Oven Unity Client

> 2D top-down action RPG client built with Unity URP, featuring a modular architecture that mirrors the server-side monorepo pattern.
> Last Updated: 2026-02-11

---

## Overview

The Unity client is **online-only** — it fetches all tile definitions, maps, and chunk data from the dashboard REST API. There is no local/offline mode. The game flow is driven entirely by server-side workflows for session management (spawn, end, resume).

**Tech stack**: Unity 2D URP, New Input System, IMGUI for UI, `UnityWebRequest` for HTTP.

---

## Project Structure

```
Assets/Scripts/
├── Infrastructure/
│   ├── GameBootstrap.cs           # Entry point — registers modules, starts init
│   ├── DI/
│   │   └── ServiceLocator.cs      # Static Dictionary<Type, object> DI container
│   ├── Modules/
│   │   ├── IGameModule.cs         # Module contract interface
│   │   ├── ModuleManager.cs       # Topological sort, lifecycle management
│   │   └── ModuleContext.cs       # Shared config (serverUrl, playerId, coroutineRunner)
│   └── Pooling/
│       └── TilemapPool.cs         # Pre-allocated Grid+Tilemap pool (30 slots)
├── Core/
│   ├── Networking/
│   │   ├── ApiClient.cs           # Static HTTP client (GET, POST, PUT, DownloadTexture)
│   │   └── JsonHelper.cs          # Sanitize nulls, WrapArray, FirstFromArray
│   ├── Tiles/Data/
│   │   ├── WorldConstants.cs      # CHUNK_SIZE=32, LAYER_COUNT=4, TILES_PER_CHUNK=1024
│   │   ├── TileData.cs            # 4-byte struct: TileId(2) + Flags(1) + Metadata(1)
│   │   ├── TileFlags.cs           # [Flags] enum: Walkable, Swimmable, Elevated, etc.
│   │   ├── TileLayer.cs           # Enum: Ground, Decoration, Collision, Metadata
│   │   └── TileCoord.cs           # Readonly struct (X, Y) with equality
│   ├── Chunks/
│   │   ├── Data/
│   │   │   ├── ChunkCoord.cs      # Readonly struct (X, Y) with equality/hash
│   │   │   └── ChunkData.cs       # TileData[4][1024] — 4 layers × 32×32
│   │   ├── Interfaces/
│   │   │   ├── IChunkProvider.cs   # LoadChunk, UnloadChunk, IsTileWalkable
│   │   │   └── IChunkLoadingStrategy.cs
│   │   └── Services/
│   │       ├── ChunkManager.cs    # Orchestrator: tracks player, loads/unloads chunks
│   │       └── RadialChunkLoadingStrategy.cs  # 5×5 grid (radius=2)
│   ├── World/
│   │   ├── Interfaces/
│   │   │   └── IWorldCoordConverter.cs
│   │   └── WorldCoordConverter.cs  # WorldToTile, TileToChunk, TileToWorld, etc.
│   └── Rendering/
│       ├── Interfaces/
│       │   ├── ITileRegistry.cs    # Maps TileId → TileBase
│       │   └── ITileFlagLookup.cs  # Maps TileId → TileFlags
│       ├── TilemapChunkRenderer.cs # Acquires Grid from pool, renders via SetTilesBlock
│       ├── ServerTileRegistry.cs   # Fetches tiles from API, downloads sprites
│       ├── TileFactory.cs          # Creates solid-color Tile assets at runtime
│       ├── TileFlagLookup.cs       # Dictionary<ushort, TileFlags>
│       ├── SpriteCacheManager.cs   # Disk cache for downloaded sprites
│       └── TileDefinitionDto.cs    # JSON DTO for tile API response
├── Modules/
│   ├── Core/
│   │   └── CoreModule.cs          # Registers WorldCoordConverter + TilemapPool
│   ├── Networking/
│   │   └── NetworkingModule.cs    # Stores server URL
│   ├── Tiles/
│   │   └── TilesModule.cs         # Loads tiles from API, builds registry + flag lookup
│   ├── Players/
│   │   ├── PlayersModule.cs       # Fetches player data from API
│   │   └── PlayerData.cs          # DTO: id, displayName, status, totalPlayTimeSeconds
│   ├── Sessions/
│   │   ├── SessionsModule.cs      # Workflow execution (spawn, end, resume)
│   │   ├── SessionHeartbeat.cs    # Idle detection, TTL warning/expiry
│   │   └── WorkflowContext.cs     # DTO for workflow execution results
│   ├── Maps/
│   │   ├── MapsModule.cs          # Map lifecycle, world creation/destruction
│   │   ├── ServerChunkProvider.cs  # Async chunk fetching from API
│   │   ├── PositionReporter.cs    # 1Hz position POST to server
│   │   ├── ChunkVisitTracker.cs   # Fog-of-war chunk visit tracking
│   │   └── MapData.cs             # DTO for map API response
│   └── UI/
│       ├── UIModule.cs            # Game state machine, flow orchestration
│       └── GameHUD.cs             # IMGUI renderer for all screens
└── Game/
    └── Movement/
        ├── PlayerMovement.cs       # WASD + arrows, walkability, wall-sliding
        └── CameraFollow.cs         # Smooth LateUpdate camera follow
```

---

## Module System

### IGameModule Interface

Every module implements `IGameModule`:

```csharp
public interface IGameModule
{
    string Name { get; }           // Unique identifier ("tiles", "maps", etc.)
    string[] Dependencies { get; } // Modules this depends on
    IEnumerator Initialize(ModuleContext context);  // Async init (coroutine)
    void OnAllModulesReady();      // Cross-module binding
    void Shutdown();               // Cleanup (reverse order)
}
```

### ModuleManager

The `ModuleManager` handles the full lifecycle:

1. **Register**: Modules registered in any order
2. **Topological sort**: Resolves dependency graph
3. **Initialize**: Calls each module's `Initialize()` in dependency order (coroutine)
4. **OnAllModulesReady**: Called on all modules after init completes
5. **Shutdown**: Reverse dependency order cleanup

### Module Dependency Graph

```
core (no deps)
  └→ networking
       └→ tiles (core, networking)
       └→ players (networking)
            └→ sessions (players)
                 └→ maps (tiles, sessions)
                      └→ ui (players, maps, sessions)
```

**Initialization order**: core → networking → tiles → players → sessions → maps → ui

### ModuleContext

Shared configuration passed to all modules:

| Field | Type | Value |
|-------|------|-------|
| `ServerUrl` | `string` | `"http://localhost:3000"` (configurable in Inspector) |
| `PlayerId` | `int` | `1` (configurable in Inspector) |
| `CoroutineRunner` | `MonoBehaviour` | The `GameBootstrap` component |

---

## Bootstrap (Entry Point)

`GameBootstrap.cs` is a `MonoBehaviour` attached to the `GameBootstrap` GameObject in the scene.

**Scene hierarchy** (at runtime):
```
GameBootstrap          [GameBootstrap, ModuleManager, GameHUD, DebugHUD]
Main Camera            [Camera, CameraFollow]
Global Light 2D        [Light2D]
[TilemapPool]          [TilemapPool] + 30 child Grids
[ChunkManager]         [ChunkManager] (created by MapsModule)
Player                 [SpriteRenderer, PlayerMovement, PositionReporter, ChunkVisitTracker]
[SessionHeartbeat]     [SessionHeartbeat] (created by UIModule)
```

**Startup flow**:
1. `Awake()`: Clear ServiceLocator, create ModuleManager, register all 7 modules
2. `Start()`: Create `ModuleContext`, call `ModuleManager.InitializeAll()` (coroutine)
3. After all modules init: Create `GameHUD` component, configure with UI/Players/Maps references
4. `UIModule.OnAllModulesReady()` starts the game flow coroutine

---

## Module Details

### Core Module

Registers foundational services:
- `WorldCoordConverter` → `ServiceLocator<IWorldCoordConverter>`
- `TilemapPool` (30 pre-allocated Grid GameObjects) → `ServiceLocator<TilemapPool>`

### Networking Module

Stores the server URL. Placeholder for future WebSocket support.

### Tiles Module

1. Creates `ServerTileRegistry` and `SpriteCacheManager`
2. Calls `ServerTileRegistry.LoadFromServer()`:
   - `GET /api/tiles` → list of tile definitions
   - For each tile: if `spritePath` exists, download sprite (with disk cache); else create solid-color tile via `TileFactory`
3. Fetches tile definitions again to build `TileFlagLookup` (maps tileId → TileFlags)
4. Registers: `ITileRegistry`, `ITileFlagLookup`, `SpriteCacheManager`

### Players Module

- `GET /api/players/:id` → `PlayerData` (id, displayName, username, status, totalPlayTimeSeconds)
- Exposes `Player` property and `IsLoaded` flag

### Sessions Module

Orchestrates server-side workflows via REST:

**`ExecuteWorkflow(workflowId, payloadJson, onComplete, onError)`**:
1. `POST /api/workflows/:id/execute` → `{ executionId }`
2. Poll `GET /api/workflow-executions/:id` every 1s (max 30 polls)
3. When `status == "completed"` → invoke `onComplete` with `WorkflowContext`

**Convenience methods**:
- `SpawnPlayer(mapId)` → executes `player-spawn` workflow
- `EndSession(endTileX, endTileY, tilesTraveled, chunksLoaded)` → executes `session-end` workflow
- `CheckResume()` → executes `session-resume` workflow

**Workflow discovery**: On init, `GET /api/workflows` → matches slugs to IDs:
- `player-spawn` → `SpawnWorkflowId`
- `session-end` → `EndWorkflowId`
- `session-resume` → `ResumeWorkflowId`

### Maps Module

**Init**: `GET /api/maps` → populates `AvailableMaps[]`

**`StartWorld(mapId, spawnX, spawnY, sessionId, assignmentId)`**:
1. Create `ServerChunkProvider` (async chunk fetcher)
2. Create `ChunkManager` GameObject with `RadialChunkLoadingStrategy(radius=2)`
3. Create `TilemapChunkRenderer` (uses pool)
4. Hook `OnChunkLoaded` to re-render chunks when async data arrives
5. Create Player GameObject at spawn position (16×16 yellow sprite)
6. Configure New Input System (WASD + arrows + gamepad)
7. Add `PlayerMovement` component
8. Set up camera (orthographic, size=8)
9. Add `PositionReporter` (1Hz) and `ChunkVisitTracker`
10. `ForceLoadAroundPlayer()` — burst-loads 5×5 chunks

**`DestroyWorld()`**: Destroys Player, ChunkManager, clears references.

**Key properties**:
- `ChunksLoaded` — incremented on each `OnChunkLoaded` callback
- `IsWorldActive` — true when Player exists
- `GetCurrentTile()` — player's tile position
- `GetTilesTraveled()` / `GetChunksVisited()` — session stats

### UI Module

The UI module is the **game state machine** that drives the entire flow.

#### Game States

```csharp
enum GameState {
    Initializing,    // Module init in progress
    LoadingPlayer,   // Player data fetched, showing welcome
    CheckingResume,  // Checking for active session
    MapSelection,    // Player picks a map
    Spawning,        // Spawn workflow executing
    LoadingWorld,    // Chunks streaming in
    Playing,         // Active gameplay
    EndingSession,   // Session-end workflow executing
}
```

#### Game Flow

```
Initialize modules
  → LoadingPlayer ("Welcome, PlayerName!")
    → CheckingResume
      ├─ [has session] "Press R to resume, N for new"
      │   ├─ R → LoadingWorld → Playing → (ESC) → EndingSession → MapSelection
      │   └─ N → MapSelection
      └─ [no session] → MapSelection
        → Select map → Spawning → LoadingWorld → Playing → (ESC) → EndingSession
        → (loop back to MapSelection)
```

#### Chunk Loading Wait

Before transitioning to `Playing`, the UI waits for initial chunks:

```csharp
// Uses explicit StartCoroutine + callback to avoid nested IEnumerator issues
bool chunksReady = false;
_context.CoroutineRunner.StartCoroutine(WaitForChunksThenSignal(9, () => chunksReady = true));
while (!chunksReady) yield return null;
```

Waits for 9 chunks (3×3 around player) with 15-second timeout.

#### Play Session (Shared Loop)

Both fresh spawn and resume use the same `PlaySession()` coroutine:

1. Create `SessionHeartbeat` (warning at 240s, expire at 300s idle)
2. Set state to `Playing`
3. Loop: check ESC key and heartbeat expiry events
4. On session end: execute `session-end` workflow with final position + stats
5. Cleanup: `DestroyWorld()`, destroy heartbeat

---

## Networking

### ApiClient

Static utility class using `UnityWebRequest`:

| Method | Usage |
|--------|-------|
| `Get(url, onSuccess, onError)` | GET request, returns body string |
| `Post(url, jsonBody, onSuccess, onError)` | POST with JSON body |
| `Put(url, jsonBody, onSuccess, onError)` | PUT with JSON body |
| `DownloadTexture(url, onSuccess, onError)` | Download image, set `FilterMode.Point` |

All methods are coroutines (`IEnumerator`).

### JsonHelper

Unity's `JsonUtility` has limitations that require workarounds:

| Method | Problem Solved |
|--------|---------------|
| `Sanitize(json)` | `JsonUtility` can't handle `null` → replaces `:null` with `:""`  |
| `WrapArray(json)` | Can't parse top-level arrays → wraps in `{"items":[...]}` |
| `FirstFromArray(json)` | Extracts first object from `[{...}]` array string |

### Float Formatting (Locale Bug)

`PositionReporter` uses `CultureInfo.InvariantCulture` for float-to-string conversion to avoid locale issues where `$"{16.5:F2}"` produces `"16,50"` on non-English systems, breaking JSON parsing on the server.

---

## Chunk Streaming

### ServerChunkProvider

Implements `IChunkProvider` with async loading:

1. `LoadChunk(coord)` → returns empty `ChunkData` placeholder immediately
2. Starts async `FetchChunk` coroutine: `GET /api/maps/:id/chunks?chunkX=X&chunkY=Y`
3. API returns array → `JsonHelper.FirstFromArray()` extracts first element
4. Decode base64 `layerData` → `Uint16Array` → populate `ChunkData` with tile IDs + flags
5. Fire `OnChunkLoaded` event → `MapsModule` triggers re-render

**Cache**: `Dictionary<ChunkCoord, ChunkData>` — in-memory only.
**Dedup**: `HashSet<ChunkCoord>` prevents duplicate requests for pending chunks.

### Chunk Data Format

Server sends base64-encoded `Uint16Array`:
- 1024 entries (32×32), 2 bytes each = 2048 bytes
- Each entry is a tile ID (0 = empty)
- Client maps tile ID → `TileFlags` via `TileFlagLookup`

### ChunkManager

MonoBehaviour that orchestrates chunk loading:
- Tracks player transform, detects chunk crossings
- Uses `RadialChunkLoadingStrategy(radius=2)` → 5×5 grid = 25 chunks
- Rate-limits to 2 chunk loads per frame
- `ForceLoadAroundPlayer()` for initial burst load

---

## Rendering

### TilemapPool

Pre-allocates 30 Grid GameObjects, each with 4 child Tilemaps (Ground, Decoration, Collision, Metadata). Grids are acquired/released as chunks load/unload.

### TilemapChunkRenderer

1. Acquires a Grid from the pool
2. Positions it at the chunk's world origin
3. Uses `tilemap.SetTilesBlock()` for batch tile assignment (one call per layer)
4. Tracks active chunks → re-render on async data arrival

### ServerTileRegistry

Maps `ushort tileId → TileBase`:
- If tile has `spritePath`: download sprite (disk-cached via `SpriteCacheManager`)
- Else: `TileFactory.CreateSolidTile(color)` creates a 1×1 pixel tile

---

## Movement

### PlayerMovement

- Uses New Input System (`InputAction` with 2DVector composite)
- Bindings: WASD, arrow keys, gamepad left stick
- Speed: 5 tiles/second (configurable)
- **Wall-sliding**: If blocked diagonally, tries X-only then Y-only movement
- Walkability: `ChunkManager.IsTileWalkable(coord)` checks `TileFlags.Walkable`

### CameraFollow

- Smooth `LateUpdate` follow with configurable speed (10) and offset (0, 0, -10)
- Orthographic camera, size 8

---

## Session Lifecycle

### Heartbeat

`SessionHeartbeat` monitors idle time:
- Resets on any input (keyboard, mouse movement)
- At 240s idle → `OnSessionExpiring` (yellow warning)
- At 300s idle → `OnSessionExpired` (auto-end session)
- If input resumes after warning → `OnActivityResumed` (clear warning)

### Position Reporting

`PositionReporter` (attached to Player):
- Every 1 second: `POST /api/player-positions` with tile, chunk, and world coordinates
- Tracks `TilesTraveled` (incremented on each tile change)
- Uses `CultureInfo.InvariantCulture` for float formatting

### Chunk Visit Tracking

`ChunkVisitTracker` (attached to Player):
- On chunk change: `POST /api/visited-chunks` (server upserts, increments visit count)
- Tracks `ChunksVisited` (local `HashSet<ChunkCoord>` count)

---

## ServiceLocator (DI)

Lightweight static `Dictionary<Type, object>`:

```csharp
ServiceLocator.Register<ITileRegistry>(registry);
var registry = ServiceLocator.Get<ITileRegistry>();
```

**Registered services** (in initialization order):
1. `IWorldCoordConverter` (CoreModule)
2. `TilemapPool` (CoreModule)
3. `ITileRegistry` (TilesModule)
4. `ITileFlagLookup` (TilesModule)
5. `SpriteCacheManager` (TilesModule)
6. `IChunkProvider` (MapsModule — per world)
7. `ChunkManager` (MapsModule — per world)

Services 6-7 are re-registered each time a new world starts.

---

## API Endpoints Used

| Module | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Tiles | `/api/tiles` | GET | Fetch tile definitions + flags |
| Players | `/api/players/:id` | GET | Load player profile |
| Sessions | `/api/workflows` | GET | Discover workflow IDs by slug |
| Sessions | `/api/workflows/:id/execute` | POST | Start workflow execution |
| Sessions | `/api/workflow-executions/:id` | GET | Poll execution status |
| Maps | `/api/maps` | GET | List available maps |
| Maps | `/api/maps/:id/chunks?chunkX=&chunkY=` | GET | Fetch single chunk |
| Position | `/api/player-positions` | POST | Report position (1Hz) |
| Position | `/api/visited-chunks` | POST | Report chunk visit |

---

## Key Patterns

### Coroutine-Based Async

All server communication uses Unity coroutines (`IEnumerator`) with callback-based results:

```csharp
yield return ApiClient.Get(url, result => json = result);
```

For long-running operations (workflow execution), polling loops with `WaitForSeconds`:

```csharp
while (status != "completed" && maxPolls-- > 0)
{
    yield return new WaitForSeconds(1f);
    yield return ApiClient.Get(pollUrl, result => { /* parse status */ });
}
```

### Nested Coroutine Workaround

Yielding an `IEnumerator` from a non-MonoBehaviour class can be unreliable. Use explicit `StartCoroutine` with callback flags:

```csharp
bool ready = false;
runner.StartCoroutine(DoWork(() => ready = true));
while (!ready) yield return null;
```

### Empty Placeholder → Re-render

`ServerChunkProvider.LoadChunk()` returns an empty `ChunkData` synchronously so the `ChunkManager` can proceed. When async data arrives, `OnChunkLoaded` fires and the chunk is re-rendered with actual tile data.

---

## Configuration

Inspector fields on `GameBootstrap`:

| Field | Default | Description |
|-------|---------|-------------|
| `_serverUrl` | `http://localhost:3000` | Dashboard API base URL |
| `_playerId` | `1` | Player ID to load |

---

## Known Limitations

- **No offline mode**: Requires running dashboard server
- **Single player**: Hard-coded `_playerId` in Inspector
- **No auth**: Direct API calls without authentication
- **IMGUI**: Temporary UI — planned upgrade to UI Toolkit or uGUI
- **No undo**: World state is ephemeral; chunks fetched fresh each session
- **Single layer rendering**: Only Ground layer populated from server data
