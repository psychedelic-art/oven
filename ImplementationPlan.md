# Plan: Build the Tile World System (Phases 1-3 + Movement)

## Context

The Oven project is a real-time action RPG on a tile grid. The Unity client at `D:\Games\Learning\Oven\oven-unity\` has URP 2D configured, Input System ready, and a full folder structure scaffolded — but **zero C# files exist yet**. Step 1.1 (folder structure) is complete. This plan implements Steps 1.2 through 3.3 plus basic movement, resulting in a **playable demo where you WASD-walk around an infinite procedurally-generated tile world**.

---

## Files to Create (24 files, in order)

### Step 1: Data Structures (6 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 1 | `Assets/Scripts/Core/Tiles/Data/WorldConstants.cs` | static class | `CHUNK_SIZE=32`, `LAYER_COUNT=4`, `TILES_PER_CHUNK=1024` |
| 2 | `Assets/Scripts/Core/Tiles/Data/TileLayer.cs` | enum : byte | Ground=0, Decoration=1, Collision=2, Metadata=3 |
| 3 | `Assets/Scripts/Core/Tiles/Data/TileFlags.cs` | [Flags] enum : byte | Walkable, Swimmable, Elevated, Transparent, Damaging, Interactable |
| 4 | `Assets/Scripts/Core/Tiles/Data/TileData.cs` | struct (4 bytes) | `TileId(ushort)` + `Flags(TileFlags)` + `Metadata(byte)`. Uses `[StructLayout(Explicit, Size=4)]`. Has `HasFlag()`, `static Empty` |
| 5 | `Assets/Scripts/Core/Tiles/Data/TileCoord.cs` | readonly struct | `(int x, int y)` with equality, hash, operators, `ToString()` |
| 6 | `Assets/Scripts/Core/Chunks/Data/ChunkCoord.cs` | readonly struct | Same pattern as TileCoord |

### Step 2: Coordinate Converter (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 7 | `Assets/Scripts/Core/World/Interfaces/IWorldCoordConverter.cs` | interface | `WorldToTile`, `TileToWorld`, `TileToChunk`, `ChunkToTileOrigin`, `TileToLocal`, `TileToLocalIndex` |
| 8 | `Assets/Scripts/Core/World/WorldCoordConverter.cs` | class | Implementation. **Critical**: uses `Mathf.FloorToInt` for negative-safe floor division. Tile = 1 Unity unit. `TileToWorld` returns tile center (+0.5, +0.5) |

### Step 3: Chunk Data (1 file)

| # | File | Type | Purpose |
|---|------|------|---------|
| 9 | `Assets/Scripts/Core/Chunks/Data/ChunkData.cs` | class | Holds `TileData[4][1024]` (4 layers x 32x32). `GetTile(layer, x, y)`, `SetTile(layer, x, y, data)`, `GetLayerData(layer)` for batch rendering |

### Step 4: Infrastructure (1 file)

| # | File | Type | Purpose |
|---|------|------|---------|
| 10 | `Assets/Scripts/Infrastructure/DI/ServiceLocator.cs` | static class | `Register<T>()`, `Get<T>()`, `TryGet<T>()`, `Clear()`. Simple Dictionary-based, no framework needed |

### Step 5: Chunk Provider (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 11 | `Assets/Scripts/Core/Chunks/Interfaces/IChunkProvider.cs` | interface | `LoadChunk(coord)`, `UnloadChunk(coord)`, `IsChunkLoaded(coord)`, events |
| 12 | `Assets/Scripts/Core/Chunks/Services/ProceduralChunkProvider.cs` | class | Perlin noise terrain: Water(<0.30), Dirt(0.30-0.45), Grass(0.45-0.75), Stone(>0.75). Noise sampled at `tileX * 0.05f + 1000f` offset. Dictionary cache. Also exposes `IsTileWalkable(TileCoord)` |

**Tile IDs**: 0=Empty, 1=Grass, 2=Dirt, 3=Water, 4=Stone

### Step 6: Loading Strategy (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 13 | `Assets/Scripts/Core/Chunks/Interfaces/IChunkLoadingStrategy.cs` | interface | `GetRequiredChunks(playerChunk)` returns 5x5 HashSet, `PrioritizeLoading(toLoad, moveDir, playerChunk)` sorts by distance + movement direction bias |
| 14 | `Assets/Scripts/Core/Chunks/Services/RadialChunkLoadingStrategy.cs` | class | LoadRadius=2 (5x5=25 chunks). Priority: closer chunks first, movement-aligned chunks biased higher |

### Step 7: Tile Rendering (3 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 15 | `Assets/Scripts/Core/Rendering/Interfaces/ITileRegistry.cs` | interface | `GetTileBase(ushort tileId)`, `HasTile(ushort)` |
| 16 | `Assets/Scripts/Core/Rendering/TileFactory.cs` | static class | `CreateSolidTile(Color)` — generates 1x1 Texture2D + Sprite + Tile at runtime. No asset files needed |
| 17 | `Assets/Scripts/Core/Rendering/RuntimeTileRegistry.cs` | class | Creates tiles via TileFactory: Grass=#4CAF50, Dirt=#8B6914, Water=#2196F3, Stone=#9E9E9E |

### Step 8: Tilemap Pool (1 file)

| # | File | Type | Purpose |
|---|------|------|---------|
| 18 | `Assets/Scripts/Infrastructure/Pooling/TilemapPool.cs` | MonoBehaviour | Pre-creates 30 Grid GameObjects, each with 4 child Tilemaps (one per layer). `Acquire()` / `Release()` with auto-expand. Grid cell size = (1,1,0) |

### Step 9: Chunk Renderer (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 19 | `Assets/Scripts/Core/Rendering/Interfaces/IChunkRenderer.cs` | interface | `RenderChunk(coord, data)`, `UnrenderChunk(coord)` |
| 20 | `Assets/Scripts/Core/Rendering/TilemapChunkRenderer.cs` | class | Acquires Grid from pool, positions at `(chunkX*32, chunkY*32, 0)`, maps TileData→TileBase via ITileRegistry, calls `SetTilesBlock()` for batch assignment (never individual SetTile). Tracks active chunks in Dictionary |

### Step 10: Chunk Manager (1 file)

| # | File | Type | Purpose |
|---|------|------|---------|
| 21 | `Assets/Scripts/Core/Chunks/Services/ChunkManager.cs` | MonoBehaviour | **The orchestrator**. Tracks player position, detects chunk boundary crossings, diffs required vs loaded chunks, unloads old chunks immediately, enqueues new chunks with priority ordering, rate-limits to 2 loads/frame. `ForceLoadAroundPlayer()` for initial burst. Exposes `IsTileWalkable(TileCoord)` |

### Step 11: Player & Camera (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 22 | `Assets/Scripts/Game/Movement/PlayerMovement.cs` | MonoBehaviour | WASD input via Input System. Smooth movement at 5 tiles/sec. Walkability check against Ground layer flags. Wall-sliding (try x-only / y-only on diagonal block) |
| 23 | `Assets/Scripts/Game/Movement/CameraFollow.cs` | MonoBehaviour | `LateUpdate` smooth follow with offset (0,0,-10). Attached to Main Camera |

### Step 12: Bootstrap + Debug (2 files)

| # | File | Type | Purpose |
|---|------|------|---------|
| 24 | `Assets/Scripts/Infrastructure/GameBootstrap.cs` | MonoBehaviour | `Awake()`: creates all services, registers in ServiceLocator, creates Player (gold 1x1 sprite, sortingOrder=100), attaches PlayerMovement + CameraFollow, calls `ChunkManager.ForceLoadAroundPlayer()` |
| 25 | `Assets/Scripts/Infrastructure/DebugHUD.cs` | MonoBehaviour | `OnGUI()`: player position, tile/chunk coords, loaded chunk count, FPS |

---

## Key Technical Decisions

1. **Runtime tile creation** via `TileFactory` — no manual asset creation needed for the prototype
2. **Each chunk gets its own Grid** from the pool — local coords (0,0)→(31,31), positioned at world `(chunkX*32, chunkY*32)`
3. **Negative coordinate handling**: `Mathf.FloorToInt((float)tileX / CHUNK_SIZE)` everywhere — C# integer division truncates toward zero which is wrong for negatives
4. **Synchronous chunk loading** for procedural provider (Perlin noise is instant). Interface supports async extension later for network provider
5. **No .asmdef files** initially — add later for compilation isolation
6. **No prefabs or scene assets** — GameBootstrap creates everything at runtime

---

## Scene Setup

Only one manual step after all code is written:
1. Open `Assets/Scenes/SampleScene.unity`
2. Create empty GameObject "GameBootstrap" → attach `GameBootstrap` and `DebugHUD` components
3. Camera already exists (orthographic, size=5 ≈ 10 tiles visible vertically)

---

## Verification

After implementation, enter Play Mode and confirm:
- [ ] 25 chunks render around origin (colored tiles: green grass, brown dirt, blue water, gray stone)
- [ ] WASD moves the gold player square smoothly
- [ ] Camera follows the player
- [ ] Walking into water is blocked (wall-sliding works on diagonals)
- [ ] Moving to new chunk boundaries triggers chunk streaming (new chunks appear, distant ones disappear)
- [ ] Walking far in any direction works infinitely — no edge, no errors
- [ ] DebugHUD shows correct tile/chunk coordinates including negatives
- [ ] No frame drops during chunk streaming (rate-limited to 2/frame)
- [ ] Console has no errors or warnings

---

## ProgressTracker Updates

After completion, mark these as done:
- Step 1.2 (Tile Data Structures) ✅
- Step 1.3 (Coordinate System & Converter) ✅
- Step 1.4 (Chunk Data Structures) ✅
- Step 2.1 (Chunk Provider Interface) ✅
- Step 2.2 (Chunk Loading Strategy) ✅
- Step 2.3 (Chunk Manager) ✅
- Step 3.1 (Tilemap Pool) ✅
- Step 3.2 (Chunk Renderer) ✅
- Step 3.3 (Integration) ✅
