# 🎯 OVEN — Development Progress Tracker

> **Last Updated**: 2026-02-09
> **Current Phase**: Phase 4 — Tile Interaction Layer
> **Current Step**: 4.1 — Tile Queries (next up)

---

## Development Philosophy

Build **bottom-up**: tiles → chunks → streaming → rendering → networking → combat.  
Every layer is **interface-first**: define the contract, then implement.  
Everything is **pluggable**: swap any implementation without touching consumers.

---

## Phase 1: Tile System Foundation (Unity Client)

The tile system is the bedrock. Nothing else works without it.

### Step 1.1 — Project Structure & Core Interfaces
> **Status**: ✅ COMPLETE  
> **Date**: 2026-02-09

- [x] Create folder structure in Unity
  - `Scripts/Core/Tiles/{Interfaces, Data, Services}`
  - `Scripts/Core/Chunks/{Interfaces, Data, Services}`
  - `Scripts/Core/World/Interfaces`
  - `Scripts/Core/Spatial`
  - `Scripts/Core/Rendering/Interfaces`
  - `Scripts/Core/Networking/Interfaces`
  - `Scripts/Infrastructure/{DI, Events, Pooling}`
  - `Scripts/Game/{Combat, Movement}`
  - `Docs/`
- [x] Create Architecture.md with all references
- [x] Create this Progress Tracker

### Step 1.2 — Tile Data Structures
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `TileId` — ushort field in TileData struct
- [x] `TileFlags` — byte flags (Walkable, Swimmable, Elevated, Transparent, Damaging, Interactable)
- [x] `TileData` — 4-byte struct with `[StructLayout(Explicit, Size=4)]`: TileId(2) + Flags(1) + Metadata(1)
- [x] `TileLayer` — enum: Ground, Decoration, Collision, Metadata
- [x] `WorldConstants` — static class: CHUNK_SIZE=32, LAYER_COUNT=4, TILE_BYTE_SIZE=4
- [ ] Unit tests for TileData serialization/deserialization (deferred)

**Deliverables**: `Scripts/Core/Tiles/Data/WorldConstants.cs`, `TileLayer.cs`, `TileFlags.cs`, `TileData.cs`

### Step 1.3 — Coordinate System & Converter
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `ChunkCoord` — readonly struct wrapping chunk (x,y) with equality/hash
- [x] `TileCoord` — readonly struct wrapping tile (x,y) with equality/hash
- [x] `IWorldCoordConverter` interface: WorldToTile, TileToWorld, TileToChunk, ChunkToTileOrigin, TileToLocal, TileToLocalIndex
- [x] `WorldCoordConverter` implementation with `Mathf.FloorToInt` for negative-safe floor division
- [ ] Unit tests for negative coordinates, boundary cases (deferred)

**Deliverables**: `Scripts/Core/Tiles/Data/TileCoord.cs`, `Scripts/Core/Chunks/Data/ChunkCoord.cs`, `Scripts/Core/World/Interfaces/IWorldCoordConverter.cs`, `Scripts/Core/World/WorldCoordConverter.cs`

### Step 1.4 — Chunk Data Structures
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `ChunkData` — class holding TileData[4][1024] (4 layers x 32x32)
  - `ChunkCoord Coord`, `int Version`, `bool IsDirty`
  - `GetTile(layer, localX, localY)`, `SetTile(layer, localX, localY, data)`, `GetLayerData(layer)`
- [ ] Binary serialization: `Serialize()` / `Deserialize()` (deferred to networking phase)
- [ ] Zlib compression (deferred to networking phase)

**Deliverables**: `Scripts/Core/Chunks/Data/ChunkData.cs`

---

## Phase 2: Chunk Loading & Management

### Step 2.1 — Chunk Provider Interface
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `IChunkProvider` interface: LoadChunk, UnloadChunk, IsChunkLoaded, IsTileWalkable, events
- [x] `ProceduralChunkProvider` — Perlin noise terrain with 4 biomes (Water, Dirt, Grass, Stone) + decorations (Flowers, Rocks)
  - Dictionary cache built-in (no separate LocalCacheChunkProvider needed for now)

### Step 2.2 — Chunk Loading Strategy
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `IChunkLoadingStrategy` interface: GetRequiredChunks, PrioritizeLoading
- [x] `RadialChunkLoadingStrategy` — 5×5 grid (loadRadius=2), priority by distance + movement direction bias

### Step 2.3 — Chunk Manager (Orchestrator)
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `ChunkManager` MonoBehaviour: tracks player, detects chunk crossings, diffs required vs loaded, unloads immediately, enqueues new chunks with priority, rate-limits to 2 loads/frame
- [x] `ForceLoadAroundPlayer()` for initial burst load (all 25 chunks on startup)
- [x] `IsTileWalkable(TileCoord)` convenience method
- [ ] `IChunkLifecycleHandler` (deferred — events available on IChunkProvider already)

---

## Phase 3: Chunk Rendering

### Step 3.1 — Tilemap Pool
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `TilemapPool` MonoBehaviour — pre-allocates 30 Grid GameObjects, each with 4 child Tilemaps (Ground, Decoration, Collision, Metadata)
- [x] `Acquire()` / `Release()` with auto-expand + warning log
- [x] `GetLayerTilemap(grid, layer)` for accessing specific layer tilemaps

### Step 3.2 — Chunk Renderer Interface & Implementation
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `IChunkRenderer` interface: RenderChunk, UnrenderChunk
- [x] `TilemapChunkRenderer` — acquires Grid from pool, positions at chunk origin, uses `SetTilesBlock()` for batch assignment, tracks active chunks
- [x] `ITileRegistry` — maps TileId → TileBase
- [x] `TileFactory` — creates solid-color Tile assets at runtime (no asset files needed)
- [x] `RuntimeTileRegistry` — 6 tile types: Grass, Dirt, Water, Stone, Flower, Rock
- [ ] `UpdateTile()` for single-tile changes (deferred — will add when needed for interaction)
- [ ] ScriptableObject-based TileRegistry for editor tooling (deferred — using runtime registry)

### Step 3.3 — Integration: ChunkManager + Renderer
> **Status**: ✅ COMPLETE
> **Date**: 2026-02-09

- [x] `GameBootstrap` MonoBehaviour wires all services: CoordConverter → TileRegistry → ChunkProvider → LoadingStrategy → TilemapPool → ChunkRenderer → ChunkManager → Player → Camera
- [x] `ServiceLocator` static class for lightweight DI
- [x] `PlayerMovement` — WASD smooth movement at 5 tiles/sec with walkability checks + wall-sliding
- [x] `CameraFollow` — smooth LateUpdate follow with offset
- [x] `DebugHUD` — FPS, world/tile/chunk coords, loaded chunks count
- [x] Test: infinite procedural world with WASD movement, chunk streaming, 25 loaded chunks ✅
- [ ] Performance profiling (visual inspection looks smooth, formal benchmark deferred)

---

## Phase 4: Tile Interaction Layer

### Step 4.1 — Tile Queries
> **Status**: 🔲 PENDING  
> **Depends on**: 2.3

- [ ] `ITileQueryService`:
  - `TileData GetTileAt(TileCoord coord, TileLayer layer)`
  - `bool IsTileWalkable(TileCoord coord)`
  - `bool IsTileInRange(TileCoord from, TileCoord to, int range)`
  - `List<TileCoord> GetTilesInRadius(TileCoord center, int radius)`
  - `List<TileCoord> GetTilesInPattern(TileCoord origin, TileOffset[] pattern, Direction facing)`
  - `bool HasLineOfSight(TileCoord from, TileCoord to)` (Bresenham/DDA)

### Step 4.2 — Tile Interaction Hooks
> **Status**: 🔲 PENDING  
> **Depends on**: 4.1

- [ ] `ITileInteractionHandler` — game-specific logic (enter tile, exit tile, interact)
- [ ] Event system: `OnEntityEnterTile`, `OnEntityExitTile`
- [ ] Trigger zones via Collision layer metadata

---

## Phase 5: Networking Integration (Chunk Streaming)

### Step 5.1 — Network Chunk Provider
> **Status**: 🔲 PENDING  
> **Depends on**: Phase 2 complete

- [ ] `INetworkChunkProvider` extends `IChunkProvider`
- [ ] WebSocket message handlers for chunk data (0x12 CHUNK_DATA)
- [ ] Binary deserialization of chunk packets
- [ ] Request queue with deduplication (don't request same chunk twice)
- [ ] Fallback to local cache if server slow

### Step 5.2 — Server-Side Chunk Manager (Node.js)
> **Status**: 🔲 PENDING  
> **Depends on**: Monorepo setup

- [ ] Postgres chunk table (map_chunks)
- [ ] In-memory LRU cache
- [ ] Redis L2 cache
- [ ] Chunk request handler: client requests → cache pipeline → respond
- [ ] Batch chunk sending on player zone entry

---

## Phase 6: Spatial Partitioning

### Step 6.1 — Spatial Hash Grid
> **Status**: 🔲 PENDING  
> **Depends on**: 1.3

- [ ] `SpatialHashGrid<T>` generic class
  - Cell size configurable (default 16×16 tiles)
  - `Insert(T entity, TileCoord position)`
  - `Remove(T entity)`
  - `Move(T entity, TileCoord from, TileCoord to)`
  - `Query(TileCoord center, int radius) → List<T>`
  - `QueryCell(int cellX, int cellY) → List<T>`

---

## Phase 7: Movement System

### Step 7.1 — Fluid Inter-Tile Movement
> **Status**: 🔲 PENDING  
> **Depends on**: Phase 4, Phase 6

- [ ] Movement controller: WASD + click-to-move
- [ ] Tile claim/release system (destination claimed on move start)
- [ ] Smooth interpolation between tile centers
- [ ] Collision validation against tile flags
- [ ] 8-directional movement with weighted costs (cardinal:2, diagonal:3)

---

## Phase 8: Combat System Foundation

### Step 8.1 — Ability Definitions (Data-Driven)
> **Status**: 🔲 PENDING

- [ ] ScriptableObject ability definitions
- [ ] AoE pattern definitions (tile offset arrays)
- [ ] Cooldown tracking
- [ ] Resource cost system (mana, stamina)

---

## Phase 9: Monorepo & Server Setup

### Step 9.1 — Turbo + pnpm Monorepo
> **Status**: 🔲 PENDING

- [ ] Initialize monorepo with pnpm-workspace.yaml
- [ ] Setup Turbo build pipeline
- [ ] Create shared packages (types, constants, game-logic, protocol)
- [ ] Setup Next.js API app
- [ ] Setup Node.js game server app

### Step 9.2 — Game Server Loop
> **Status**: 🔲 PENDING

- [ ] Fixed-timestep loop with hybrid timer
- [ ] bitECS setup with core components
- [ ] System execution pipeline
- [ ] WebSocket server with binary protocol

---

## Phase 10: Full Integration

### Step 10.1 — Client ↔ Server Connection
> **Status**: 🔲 PENDING

- [ ] JWT auth flow (REST → WebSocket handoff)
- [ ] Server-authoritative movement
- [ ] Client-side prediction + reconciliation
- [ ] Entity interpolation for other players

### Step 10.2 — End-to-End Gameplay
> **Status**: 🔲 PENDING

- [ ] Two players connect → see each other → move around → chunks stream
- [ ] Basic combat: cast spell → server validates → damage appears
- [ ] PvP arena: matchmake → instance create → combat → results

---

## Progress Summary

| Phase | Description | Steps | Complete | Status |
|-------|-------------|-------|----------|--------|
| 1 | Tile System Foundation | 4 | 4/4 | ✅ Complete |
| 2 | Chunk Loading & Management | 3 | 3/3 | ✅ Complete |
| 3 | Chunk Rendering | 3 | 3/3 | ✅ Complete |
| 4 | Tile Interaction Layer | 2 | 0/2 | 🔲 Pending |
| 5 | Networking (Chunks) | 2 | 0/2 | 🔲 Pending |
| 6 | Spatial Partitioning | 1 | 0/1 | 🔲 Pending |
| 7 | Movement System | 1 | 0/1 | 🔲 Pending |
| 8 | Combat Foundation | 1 | 0/1 | 🔲 Pending |
| 9 | Monorepo & Server | 2 | 0/2 | 🔲 Pending |
| 10 | Full Integration | 2 | 0/2 | 🔲 Pending |
| **Total** | | **21** | **10/21** | **~48%** |

---

## Architecture Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-09 | Unity 2D URP as client | 2D tile-based game, URP for modern rendering pipeline |
| 2026-02-09 | 32×32 chunk size | Balance between memory (8KB), network (2-4KB compressed), and render batch size |
| 2026-02-09 | 4 bytes per tile | TileId(2) + Flags(1) + Metadata(1) — compact, cache-friendly |
| 2026-02-09 | Interface-first design | Pluggable architecture: swap rendering, data source, or networking without touching consumers |
| 2026-02-09 | Real-time combat (not turn-based) | Core game design: fluid action combat on tile grid |
| 2026-02-09 | Server-authoritative | Anti-cheat: server validates all actions, client is untrusted |
| 2026-02-09 | 20-30 Hz server tick | Sufficient for tile-grid RPG, matches Albion Online |
| 2026-02-09 | bitECS on server | TypedArrays outside V8 heap → zero GC for game state |
| 2026-02-09 | Binary WebSocket protocol | 7-10× smaller than JSON, critical at 20Hz broadcast |
| 2026-02-09 | Runtime tile creation via TileFactory | No manual asset creation needed for prototyping; colored 1x1 tiles generated at runtime |
| 2026-02-09 | ServiceLocator for DI | Lightweight static Dictionary-based; upgrade to proper DI later |
| 2026-02-09 | Each chunk gets own Grid from pool | Local coords 0-31 avoid coordinate math headaches; Grid positioned at world origin |
| 2026-02-09 | Smooth continuous movement (not discrete) | Better game feel for initial demo; tile-snapping can be layered later |

---

*Update this tracker after completing each step. Keep the summary table current.*
