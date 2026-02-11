# Maps System — Implementation Reference

> Tile world system: tiles, chunks, maps, generation, and Unity client integration.
> Last Updated: 2026-02-11

---

## Overview

The maps system spans the full stack:
- **Server**: Tile definitions, world configs, maps, chunks stored in Neon Postgres
- **Generation**: Simplex noise terrain generation (server-side)
- **Editor**: React Three Fiber visual editor for painting tiles
- **Unity Client**: Async chunk streaming, tilemap rendering, WASD movement

---

## Server Components (`@oven/module-maps`)

### Tables

**tile_definitions** — 6 seeded tiles
| tileId | Name | Flags | Category |
|--------|------|-------|----------|
| 1 | Grass | Walkable (1) | terrain |
| 2 | Dirt | Walkable (1) | terrain |
| 3 | Water | Swimmable (2) | terrain |
| 4 | Stone | Walkable+Elevated (5) | terrain |
| 5 | Flower | Walkable (1) | decoration |
| 6 | Rock | None (0) | obstacle |

Sprites: Grass has a Vercel Blob sprite. Others use `colorHex` fallback.

**world_configs** — Chunk system parameters, terrain noise, biome thresholds (JSONB), player/camera settings.

**maps** — name, mode (discovery/prebuilt), status (draft/generating/ready/archived), bounds (JSONB), seed, worldConfigId FK.

**map_chunks** — mapId + (chunkX, chunkY) unique. `layerData` is base64-encoded Uint16Array (1024 entries = 32x32 tiles).

### Generation (Discovery Mode)

When `GET /api/maps/:id/chunks?chunkX=0&chunkY=0` is called and the chunk doesn't exist:

1. Look up the map's worldConfig (noise scale, biome thresholds, seed)
2. For each of the 32x32 tiles, compute simplex noise value
3. Map noise value to tileId via biome thresholds:
   - `< -0.2` → Water (3)
   - `< 0.0` → Dirt (2)
   - `< 0.5` → Grass (1)
   - `< 0.7` → Stone (4)
   - otherwise → Flower (5)
4. Encode as Uint16Array → base64 → save to DB → return

### API (10 handlers)

See [routes.md](../routes.md) for full reference. Key endpoints:
- `GET /api/maps/:id/chunks?chunkX=&chunkY=` — auto-generates for discovery maps
- `POST /api/maps/:id/chunks` — upsert with `onConflictDoUpdate` (map editor saves)
- `POST /api/maps/:id/generate` — bulk generation

---

## Map Editor (`@oven/map-editor`)

React Three Fiber package embedded at `/#/maps/:id/editor`.

### Architecture

```
MapEditor
  ├─ EditorToolbar        — Paint / Erase / Pan tool selection
  ├─ TilePalette          — Tile list fetched from /api/tiles
  ├─ TileMapCanvas        — R3F Canvas (orthographic camera)
  │   ├─ ChunkMesh[]      — DataTexture per chunk (GPU rendering)
  │   ├─ PaintLayer       — Raycasting for paint/erase interaction
  │   ├─ CursorHighlight  — Hover indicator mesh
  │   └─ ChunkGrid        — Debug grid lines
  └─ useMapEditor hook    — State: chunks, selectedTile, tool, zoom, dirty set
```

### Chunk Encoding

```typescript
decodeTileData(base64: string): Uint16Array  // layerData → in-memory array
encodeTileData(tiles: Uint16Array): string    // in-memory array → base64 for save
chunkKey(x: number, y: number): string        // "x,y" coordinate key
```

### Tools
- **Paint**: Click/drag to place selected tile on ground layer
- **Erase**: Click/drag to clear tile (set tileId = 0)
- **Pan**: Middle-click or hold tool to drag camera
- **Fill**: Planned (not yet implemented)
- **Undo/Redo**: Planned

---

## Unity Client

### Module: MapsModule

Manages the full map lifecycle on the client side.

**Initialization**: Fetches `GET /api/maps` → stores `AvailableMaps[]`

**StartWorld(mapId, spawnX, spawnY, sessionId, assignmentId)**:
1. Creates `ServerChunkProvider` (async chunk fetching)
2. Creates `ChunkManager` with `RadialChunkLoadingStrategy(radius=2)` → 5x5 grid
3. Creates `TilemapChunkRenderer` (pooled Unity Tilemaps)
4. Subscribes to `OnChunkLoaded` → increments counter, re-renders chunk
5. Creates Player GameObject with sprite, PlayerMovement, PositionReporter
6. Sets up camera follow
7. Calls `ForceLoadAroundPlayer()` → triggers async chunk loading

**WaitForInitialChunks(minChunks)**: Coroutine yields until N async chunks arrive (15s timeout).

**DestroyWorld()**: Cleans up all GameObjects, clears chunk cache.

### Module: ServerChunkProvider

Implements `IChunkProvider`. On `LoadChunk(coord)`:
1. Returns empty `ChunkData` placeholder immediately (synchronous)
2. Starts coroutine to `GET /api/maps/:id/chunks?chunkX=&chunkY=`
3. On response: decodes base64 → builds `ChunkData` with `TileFlags` from `TileFlagLookup`
4. Updates cache and fires `OnChunkLoaded` event

### Key Files (~40 C# scripts total)

| Path | Purpose |
|------|---------|
| `Core/Tiles/Data/` | TileData, TileCoord, ChunkCoord, TileFlags, WorldConstants |
| `Core/Chunks/Data/` | ChunkData (4-layer tile storage) |
| `Core/Chunks/Services/` | ChunkManager, RadialChunkLoadingStrategy |
| `Core/Rendering/` | TilemapChunkRenderer, TilemapPool, ServerTileRegistry, TileFactory |
| `Core/Networking/` | ApiClient, JsonHelper, DTO classes |
| `Core/World/` | WorldCoordConverter |
| `Game/Movement/` | PlayerMovement (New Input System), CameraFollow |
| `Modules/Maps/` | MapsModule, ServerChunkProvider, PositionReporter, ChunkVisitTracker |
| `Modules/Tiles/` | TilesModule, TileFlagLookup |
| `Modules/UI/` | UIModule (state machine), GameHUD (IMGUI) |
| `Modules/Sessions/` | SessionsModule, SessionHeartbeat, SessionData DTOs |
| `Modules/Players/` | PlayersModule |
| `Infrastructure/` | ServiceLocator, ModuleManager, ModuleContext, CoroutineRunner |

---

## Coordinate System

```
World Position (float)  →  Unity pixel/unit space
       ↕ IWorldCoordConverter
Tile Position (int)     →  Discrete grid (tileX, tileY)
       ↕ floor division
Chunk Position (int)    →  Which chunk (chunkX, chunkY)
       ↕ modulo
Local Tile Index (int)  →  Position within chunk (0-1023)
```

**Constants**: `CHUNK_SIZE = 32`, `LAYER_COUNT = 4`, `TILES_PER_CHUNK = 1024`

**Formulas**:
- `chunkX = FloorToInt(tileX / 32)`
- `localX = ((tileX % 32) + 32) % 32` (handles negatives)
- `tileIndex = localY * 32 + localX`
