# 🏗️ OVEN — Real-Time Action RPG on Tile Grid
## Complete Architectural Blueprint

> **Project**: Oven  
> **Engine**: Unity 2D URP (Client) + Node.js (Game Server) + Next.js (REST API)  
> **Database**: Neon Postgres  
> **Monorepo**: Turbo + pnpm + Vite  
> **Last Updated**: 2026-02-09

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [The Server Game Loop](#2-the-server-game-loop)
3. [Entity Component System (ECS)](#3-entity-component-system)
4. [Tile System Architecture](#4-tile-system-architecture)
5. [Chunk-Based Infinite World](#5-chunk-based-infinite-world)
6. [Spatial Partitioning](#6-spatial-partitioning)
7. [Networking Protocol](#7-networking-protocol)
8. [Real-Time Combat System](#8-real-time-combat-system)
9. [Pathfinding](#9-pathfinding)
10. [Database Schema](#10-database-schema)
11. [Monorepo Structure](#11-monorepo-structure)
12. [REST API vs WebSocket Split](#12-rest-api-vs-websocket-split)
13. [Instance Management & Scaling](#13-instance-management--scaling)
14. [Anti-Cheat & Server Authority](#14-anti-cheat--server-authority)
15. [End-to-End Data Flows](#15-end-to-end-data-flows)
16. [Performance Optimization](#16-performance-optimization)
17. [References & Resources](#17-references--resources)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UNITY CLIENT                             │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ Tile/Chunk│ │ Client-Side  │ │  Renderer  │ │  Input      │  │
│  │ Streaming │ │ Prediction   │ │ (Tilemap)  │ │  Manager    │  │
│  └─────┬────┘ └──────┬───────┘ └─────┬──────┘ └──────┬──────┘  │
│        │             │               │                │         │
│  ┌─────┴─────────────┴───────────────┴────────────────┴──────┐  │
│  │                  NETWORK LAYER (WebSocket)                 │  │
│  └────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              │ WebSocket   │   REST/HTTP  │
              ▼             │              ▼
┌─────────────────────┐     │    ┌──────────────────────┐
│   NODE.JS GAME      │     │    │   NEXT.JS REST API   │
│   SERVER            │     │    │                      │
│ ┌─────────────────┐ │     │    │ • Authentication     │
│ │ Fixed-Timestep  │ │     │    │ • Character CRUD     │
│ │ Game Loop       │ │     │    │ • Inventory Mgmt     │
│ │ (20-30 Hz)      │ │     │    │ • Matchmaking Queue  │
│ ├─────────────────┤ │     │    │ • Social Features    │
│ │ ECS (bitECS)    │ │     │    │ • Leaderboards       │
│ │ • Movement Sys  │ │     │    └──────────┬───────────┘
│ │ • Combat Sys    │ │     │               │
│ │ • Spell Sys     │ │     │               │
│ │ • AI Sys        │ │     │               │
│ ├─────────────────┤ │     │               │
│ │ Spatial Hash    │ │     │               │
│ │ Interest Mgmt   │ │     │               │
│ ├─────────────────┤ │     │               │
│ │ Chunk Manager   │ │     │               │
│ │ Instance Router │ │     │               │
│ └────────┬────────┘ │     │               │
└──────────┼──────────┘     │               │
           │                │               │
           ▼                │               ▼
    ┌─────────────┐         │        ┌─────────────┐
    │    REDIS    │         │        │ NEON        │
    │ • Sessions  │◄────────┘        │ POSTGRES    │
    │ • Chunk L2  │                  │ • Accounts  │
    │ • Pub/Sub   │                  │ • Characters│
    │ • Matchmake │                  │ • Chunks    │
    └─────────────┘                  │ • Items     │
                                     └─────────────┘
```

> **Ref**: [Colyseus — Multiplayer Framework for Node.js](https://github.com/colyseus/colyseus)  
> Room-based instance management, state synchronization, and WebSocket handling.

---

## 2. The Server Game Loop

The entire game simulation runs inside a **fixed-timestep game loop** on the Node.js server at **20–30 Hz** (33–50ms per tick).

### Tick Phases (executed in strict order every tick):

```
TICK START
  │
  ├─ 1. Receive & Queue Inputs (from WebSocket buffer)
  ├─ 2. Validate & Process Inputs (rules check)
  ├─ 3. Execute Movement System (pathfinding, collision)
  ├─ 4. Execute Ability/Combat Systems (damage, healing, projectiles)
  ├─ 5. Tick Status Effects (DoTs, buffs, debuffs)
  ├─ 6. Tick Cooldowns & Resources (mana regen, CD reduction)
  ├─ 7. Process AI (behavior trees, aggro)
  ├─ 8. Update Spatial Index (re-hash moved entities)
  ├─ 9. Broadcast State (delta-compressed, interest-managed)
  │
TICK END
```

### Timer Implementation

Standard `setInterval` has ~16ms jitter. Use a hybrid approach: `setTimeout` to sleep until ~25ms before tick, then `setImmediate` spin-loop with `process.hrtime.bigint()` for sub-ms accuracy. Use an accumulator pattern to ensure deterministic simulation.

> **Ref**: [Glenn Fiedler — "Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/)  
> The definitive article on fixed-timestep game loops. Accumulator pattern prevents "spiral of death" and ensures deterministic simulation regardless of timer jitter.

> **Ref**: [Overwatch GDC Talk — "Gameplay Architecture and Netcode"](https://www.youtube.com/watch?v=W3aieHjyNvw)  
> Blizzard reported ~40% server tick improvement after refactoring to ECS. Describes deterministic simulation and prediction/reconciliation.

---

## 3. Entity Component System

### Why bitECS for Node.js

bitECS stores all component data in TypedArrays (Float32Array, Int32Array) using Structure-of-Arrays (SoA) layout. Data lives **outside V8's managed heap**, eliminating garbage collection pressure — the single biggest threat to real-time Node.js servers.

### Core Components (TypedArray-backed):

| Component | Fields | Type |
|-----------|--------|------|
| Position | tileX, tileY | i32, i32 |
| Movement | speed, destTileX, destTileY, progress, isMoving | f32, i32, i32, f32, u8 |
| Health | current, max, regenPerTick | f32, f32, f32 |
| Mana | current, max, regenPerTick | f32, f32, f32 |
| Combat | attackPower, defense, attackSpeed, attackRange, critChance | f32, f32, f32, u8, f32 |
| SpellSlots | slot1Id..slot6Id, cd1Remaining..cd6Remaining | u16[], u16[] |
| StatusFlags | activeFlags (bitmask) | u64 |
| Faction | factionId | u8 |
| NetworkSync | lastSyncTick, dirtyMask | u32, u32 |

### System Execution Order:

```
InputSystem → AISystem → MovementSystem → CooldownSystem → 
SpellCastSystem → ProjectileSystem → CombatResolutionSystem → 
StatusEffectSystem → DeathSystem → RegenerationSystem → 
SpatialIndexSystem → NetworkSyncSystem
```

> **Ref**: [bitECS](https://github.com/NateTheGreatt/bitECS)  
> Fastest JavaScript ECS. SoA layout with TypedArrays, zero GC allocations.

> **Ref**: [ECS Architecture Tutorial](https://generalistprogrammer.com/tutorials/entity-component-system-complete-ecs-architecture-tutorial)  
> Comprehensive guide to data-oriented ECS design.

---

## 4. Tile System Architecture

### Design Principles

The tile system is **completely agnostic and pluggable**. All tile logic is accessed through interfaces, allowing any game to swap rendering, data sources, or tile behaviors without modifying core logic.

### Tile Data Model

```
ITileData
├── TileId: ushort (0-65535 tile types)
├── Flags: byte (walkable, swimmable, elevated, transparent, damaging)
├── Elevation: byte (0-15 height levels)
├── Metadata: byte (biome, variant, rotation)
```

Each tile is **4 bytes** in memory. A 32×32 chunk = 4,096 bytes per layer.

### Layer System

```
Layer 0: GROUND      — Base terrain (grass, stone, water, sand)
Layer 1: DECORATION  — Props, flowers, rocks (purely visual)
Layer 2: COLLISION   — Walls, obstacles, trigger zones
Layer 3: METADATA    — Spawn points, zone transitions, interaction markers
```

### Interface Architecture (Unity Client)

```
ITileDataProvider          — Resolves tile data from any source (server, file, procedural)
IChunkProvider             — Loads/unloads chunk data (server stream, local cache, editor)
IChunkRenderer             — Renders chunks visually (Unity Tilemap, custom mesh, sprite)
IChunkLifecycleHandler     — Hooks for chunk load/unload events
ITileInteractionHandler    — Game-specific tile interaction logic
IWorldCoordConverter       — Converts between tile coords, chunk coords, world positions
```

### Coordinate System

```
World Position (float):  Pixel/unit space for Unity rendering
  ↕ IWorldCoordConverter
Tile Position (int):     Discrete grid coordinate (tileX, tileY)
  ↕ Simple division
Chunk Position (int):    Which chunk contains this tile (chunkX, chunkY)
  ↕ Simple modulo
Local Tile Index (int):  Position within the chunk (0-1023 for 32×32)
```

**Formulas:**
- `chunkX = floor(tileX / CHUNK_SIZE)`
- `chunkY = floor(tileY / CHUNK_SIZE)`
- `localX = tileX - (chunkX * CHUNK_SIZE)` (handles negatives correctly with floor)
- `localY = tileY - (chunkY * CHUNK_SIZE)`
- `localIndex = localY * CHUNK_SIZE + localX`

> **Ref**: [Red Blob Games — Grids and Coordinates](https://www.redblobgames.com/grids/)  
> The definitive resource for grid coordinate systems, hex grids, and tile math.

> **Ref**: [Unity — "Best Way To Handle Millions Of Tiles"](https://discussions.unity.com/t/best-way-to-handle-millions-of-tiles/826950)  
> Community solutions for large tilemap performance including chunked tilemaps and pooling.

---

## 5. Chunk-Based Infinite World

### Chunk Specifications

| Property | Value | Rationale |
|----------|-------|-----------|
| Chunk Size | 32×32 tiles | 1024 tiles per layer, fits cache lines |
| Layers | 4 | Ground, Decoration, Collision, Metadata |
| Raw Size | ~8 KB (4 layers × 2 bytes × 1024) | — |
| Compressed | ~2-4 KB (zlib) | Single WebSocket message |
| Load Radius | 5×5 chunks (25 total) | Inner 3×3 visible, outer ring buffer |
| View Distance | ~160 tiles (5 × 32) | Covers any reasonable camera zoom |

### Three-Tier Caching Pipeline

```
Player moves → crosses chunk boundary
  │
  ├─ Calculate required chunks (5×5 around player)
  ├─ Diff against currently loaded chunks
  ├─ Request missing chunks:
  │     │
  │     ├─ L1: In-Process LRU Cache (Node.js memory)
  │     │   Hit: <1ms → serve immediately
  │     │
  │     ├─ L2: Redis Cache (shared across servers)
  │     │   Hit: <5ms → serve, populate L1
  │     │
  │     └─ L3: Neon Postgres (source of truth)
  │         Hit: 5-50ms → serve, populate L2 + L1
  │
  ├─ Send chunks to client via WebSocket (zlib compressed)
  ├─ Client decompresses, caches locally
  ├─ Client renders via pooled Tilemap GameObjects
  └─ Unload chunks beyond load radius
```

### Predictive Loading

Bias chunk loading toward the player's **movement direction**. If moving right, prioritize loading the rightmost column of the 5×5 grid before the leftmost.

### Unity Client Chunk Rendering

```
ChunkPool (reusable Tilemap GameObjects)
  │
  ├─ OnChunkLoad:
  │   ├─ Dequeue Tilemap from pool
  │   ├─ Position at chunk world coords
  │   ├─ SetTilesBlock() for batch tile assignment
  │   └─ Enable renderer
  │
  └─ OnChunkUnload:
      ├─ Clear tilemap data
      ├─ Disable renderer
      └─ Return to pool
```

**CRITICAL**: Never use individual `SetTile()` — `SetTilesBlock()` is orders of magnitude faster for chunk-sized updates.

> **Ref**: [Minecraft Wiki — Chunk Format](https://minecraft.wiki/w/Chunk)  
> Gold standard for chunk-based world streaming. Describes format, load distance, tick scheduling.

> **Ref**: [Ark Times — "Server Chunk Loading: How Games Handle Vast Worlds"](https://001.arktimes.com/server-chunk-loading-how-games-handle-vast-worlds/)  
> Chunk loading patterns from Minecraft, Valheim, No Man's Sky.

---

## 6. Spatial Partitioning

### Fixed-Grid Spatial Hash

The tile grid IS the spatial partition. Cells of **8×8 or 16×16 tiles** (matching max spell range). Each cell stores a list of entity IDs.

```
Query: "Find all entities near player at tile (50, 30)"
  ├─ Compute cell: (50/16, 30/16) = (3, 1)
  ├─ Check cell (3,1) + 8 neighbors = 9 cells
  ├─ 9 cells × ~10 entities/cell = ~90 comparisons
  └─ Filter by actual distance if needed
```

### Interest Management (AOI)

Each player's Area of Interest = their spatial hash cell + 8 neighbors. Server **only sends entity updates to players whose AOI contains that entity**. Entities outside AOI are invisible — no position, no state, nothing.

> **Ref**: [Game Programming Patterns — "Spatial Partition"](https://gameprogrammingpatterns.com/spatial-partition.html)  
> Clear explanation of spatial hashing and grid-based partitioning.

> **Ref**: ["Area of Interest Management in MMOGs"](https://link.springer.com/10.1007/978-3-319-08234-9_239-1) (Springer)  
> Academic overview of AOI algorithms for massively multiplayer games.

---

## 7. Networking Protocol

### Binary Protocol Structure

```
┌─────────┬──────────┬──────────────────┐
│ Type(1B)│Length(2B) │ Payload (var)    │
└─────────┴──────────┴──────────────────┘

High-frequency (binary):
  0x01 MOVE_INPUT        — tileX(i16), tileY(i16), seq(u32)
  0x02 CAST_SPELL        — spellId(u16), targetX(i16), targetY(i16), seq(u32)
  0x03 ATTACK            — targetEntityId(u32), seq(u32)
  0x10 STATE_SNAPSHOT    — tick(u32), entityCount(u16), [entityDeltas...]
  0x11 ENTITY_DELTA      — entityId(u32), componentMask(u16), [changed fields...]
  0x12 CHUNK_DATA        — chunkX(i32), chunkY(i32), compressedData(bytes)

Low-frequency (MessagePack):
  0x80 CHAT_MESSAGE
  0x81 INVENTORY_UPDATE
  0x82 SPELL_RESULT
  0x83 MATCH_EVENT
```

### Bandwidth Estimates

| Direction | Data | Rate |
|-----------|------|------|
| Client → Server | Movement + abilities | ~1-2 KB/s |
| Server → Client | Entity deltas (20 entities @ 20Hz) | ~5-10 KB/s |
| Server → Client | Chunk streaming during movement | ~2-5 KB/s burst |
| **Total per player** | | **~8-17 KB/s** |

### Client-Side Prediction & Server Reconciliation

```
CLIENT:                                 SERVER:
1. Player presses "move right"
2. Predict: move to tile (6,3)
3. Store input {seq:47, dir:right}
4. Send input to server ──────────►     5. Validate move
                                        6. Apply if valid
7. Receive server state ◄──────────     7. Send state + lastSeq:47
8. Discard inputs ≤ 47
9. Re-apply inputs > 47
10. Match → no correction
    Differ → smooth interpolate to server pos
```

> **Ref**: [Gabriel Gambetta — "Client-Side Prediction and Server Reconciliation"](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)  
> Step-by-step walkthrough with interactive demos.

> **Ref**: [Gaffer On Games — "Reading and Writing Packets"](https://gafferongames.com/post/reading_and_writing_packets/)  
> Best practices for binary game protocol serialization.

> **Ref**: [SnapNet — "Snapshot Interpolation"](https://snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/)  
> Snapshot interpolation for smooth remote entity rendering.

> **Ref**: [Doppnet — "Game Networking Message Serialisation"](https://www.doppnet.com/game-networking-message-serialisation.html)  
> JSON vs binary vs FlatBuffers comparison. JSON is 7-10× larger.

---

## 8. Real-Time Combat System

### Ability Types

| Type | Server Processing | Client Prediction |
|------|-------------------|-------------------|
| Instant | Immediate AoE calc, damage resolve | Show animation + CD, wait for damage |
| Projectile | Spawn entity, advance per tick, collisions | Show VFX, interpolate position |
| Channeled | Track channel state, periodic effects, interrupts | Show channel animation, cancel on reject |
| Melee | Check adjacent tiles, apply damage | Show attack animation |
| Ranged Physical | DDA raycast for LOS, range check | Show projectile arc |

### AoE Patterns (tile offsets relative to target)

```
Single: [(0,0)]
Cross:  [(0,0),(1,0),(-1,0),(0,1),(0,-1)]
3×3:    [all (dx,dy) where |dx|≤1 and |dy|≤1]
Line:   [(0,1),(0,2),(0,3)] rotated by facing
Cone:   expanding fan pattern
Ring:   all tiles at exactly distance R
```

### Damage Formula

```
rawDamage = skillBasePower × (attackerATK × 100 / (100 + targetDEF))
elementalMod = 0.5 | 1.0 | 1.5 | 2.0
critMod = if crit: 1.5 + critBonus; else: 1.0
variance = random(0.9, 1.1)
buffMod = product of active multipliers
finalDamage = max(1, floor(rawDamage × elementalMod × critMod × variance × buffMod))
```

### Status Effects

| Effect | Movement | Abilities | Combat |
|--------|----------|-----------|--------|
| Stun | ✗ Blocked | ✗ Blocked | — |
| Root | ✗ Blocked | ✓ Allowed | — |
| Silence | ✓ Allowed | ✗ Blocked | — |
| Slow | ½ Speed | ✓ Allowed | — |
| Poison/Burn | ✓ | ✓ | Periodic damage |
| Knockback | Forced 1-3 tiles | Interrupts channel | — |

> **Ref**: [Unreal Engine — Gameplay Ability System](https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system)  
> Industry-standard ability system: tag-based interactions, attribute sets, gameplay effects.

> **Ref**: [RPG Wiki — Damage Formula](https://rpg.fandom.com/wiki/Damage_Formula)  
> ATK×100/(100+DEF) provides balanced scaling with diminishing returns.

> **Ref**: [ModDB — "Designing a Multiplayer Spell System"](https://www.moddb.com/tutorials/designing-a-multiplayer-spell-system)  
> Practical guide to networked spell systems with prediction and validation.

---

## 9. Pathfinding

### Real-Time Pathfinding Strategy

| Scenario | Algorithm | Cost |
|----------|-----------|------|
| Short path (<20 tiles) | A* with binary heap | <0.1ms |
| Long path (>40 tiles) | Hierarchical A* (HPA*) | <1ms |
| Many entities, same target | Flow Fields (Dijkstra) | O(N) once, O(1)/entity |
| WASD movement | Direct validation (no pathfinding) | O(1) |

### Time-Slicing

Process max **200 A* nodes per tick**. If incomplete, resume next tick. Caps pathfinding CPU to ~2ms/tick.

### Worker Thread Offloading

CPU-intensive pathfinding on 2-4 `worker_threads`. Position data in `SharedArrayBuffer` for zero-copy reads.

> **Ref**: [Red Blob Games — "Grid Pathfinding Optimizations"](https://www.redblobgames.com/pathfinding/grids/algorithms.html)  
> A*, JPS, and grid pathfinding with interactive demos.

> **Ref**: ["How to RTS: Basic Flow Fields"](https://howtorts.github.io/2014/01/04/basic-flow-fields.html)  
> Flow field pathfinding for multiple entities converging on one target.

> **Ref**: [Game Developer — "Pathing & Movement on a 3D Grid"](https://www.gamedeveloper.com/design/pathing-movement-on-a-3d-grid)  
> Advanced grid pathfinding with elevation.

---

## 10. Database Schema (Neon Postgres)

### Critical Rule

**Never read from the database inside the game loop.** Load at session start, hold in memory, write back on events or every 30-60s.

### Core Tables

```
accounts           — id, email, username, password_hash, status, premium_currency
characters         — id, account_id, name, class_id, level, xp, stats(JSONB), zone_id, pos_x, pos_y
classes            — id, name, base_stats(JSONB), spell_tree(JSONB)
item_definitions   — id, name, type, rarity, slot_type, base_stats(JSONB), stackable
item_instances     — id, definition_id, character_id, properties(JSONB), quantity, equipped, bag_slot
spell_definitions  — id, name, type, damage_type, base_power, mana_cost, cooldown, aoe_pattern(JSONB)
character_spells   — character_id, spell_id, slot_index, spell_level
map_chunks         — chunk_x, chunk_y, layer_data(BYTEA), version, updated_at
matches            — id, type, map_id, started_at, ended_at, result(JSONB)
match_participants — match_id, character_id, team, stats(JSONB), mmr_before, mmr_after
character_ratings  — character_id, pvp_mmr, wins, losses, season_id
guilds             — id, name, tag, leader_id, description
guild_members      — guild_id, character_id, rank, joined_at
marketplace        — id, seller_id, item_instance_id, price, listed_at, expires_at, status
transaction_log    — id, type, character_id, item_id, gold_change, details(JSONB), created_at
```

### Chunk Storage: BYTEA Blobs

Each chunk = all 4 layers packed into a single BYTEA column (~2-4 KB compressed). Vastly more efficient than per-tile rows.

> **Ref**: [Neon — JSONB Data Types](https://neon.com/docs/data-types/json)  
> JSONB for flexible game data that evolves during development.

> **Ref**: [Neon — Connection Pooling](https://neon.com/docs/connect/connection-pooling)  
> Built-in PgBouncer for game server connection management.

> **Ref**: [Postgres TOAST + JSONB](https://medium.com/@josef.machytka/how-postgresql-stores-jsonb-data-in-toast-tables-8fded495b308)  
> How Postgres handles large JSONB values transparently.

> **Ref**: [Materialized Views for Fast Queries](https://smartpostgres.com/posts/using-materialized-views-to-make-queries-run-faster/)  
> Leaderboard queries via periodic materialized view refresh.

---

## 11. Monorepo Structure

```
oven/
├── apps/
│   ├── game-server/          # Node.js WebSocket server
│   │   ├── src/
│   │   │   ├── loop/         # Fixed-timestep game loop
│   │   │   ├── systems/      # ECS systems
│   │   │   ├── instances/    # Instance/room management
│   │   │   ├── network/      # WebSocket handling, protocol
│   │   │   └── chunks/       # Chunk loading, caching
│   │   └── package.json
│   ├── api/                  # Next.js REST API
│   │   ├── src/app/api/
│   │   └── package.json
│   └── web/                  # Vite admin panel + website
│       └── package.json
├── packages/
│   ├── shared-types/         # TypeScript interfaces
│   ├── game-logic/           # Combat formulas, movement validation
│   ├── protocol/             # Binary message definitions
│   ├── constants/            # Tick rate, tile size, chunk size
│   ├── database/             # Drizzle ORM schema, migrations
│   ├── typescript-config/
│   └── eslint-config/
├── unity-client/             # Unity project (this project)
│   └── Assets/Scripts/
│       ├── Core/             # Agnostic systems (Tiles, Chunks, Spatial)
│       ├── Infrastructure/   # DI, Events, Pooling
│       └── Game/             # Game-specific (Combat, Movement)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

> **Ref**: [Turborepo — Internal Packages](https://turbo.build/repo/docs/guides/tools/typescript#internal-packages)  
> Shared packages export raw TypeScript, consuming apps transpile.

---

## 12. REST API vs WebSocket Split

### REST API (Next.js) — Non-Realtime

Auth, character CRUD, inventory, matchmaking queue, social features, game data endpoints.

### WebSocket (Game Server) — Realtime

Movement, entity state, chunk streaming, combat, chat, trading, loot.

### Auth Handoff

```
1. Unity → POST /auth/login → REST validates → JWT + refresh token
2. Unity opens WebSocket → sends JWT as first message
3. Game server validates JWT → loads character → places in world
4. WebSocket connection IS the session
5. Client refreshes JWT via REST; sends to game server only on reconnect
```

---

## 13. Instance Management & Scaling

| Type | Persistence | Capacity | Lifecycle |
|------|-------------|----------|-----------|
| Open world zones | Persistent | 50-200 players | Always running |
| Hub/town areas | Persistent | 100-500 players | Always on, duplicated |
| PvP arenas | Temporary | 2-10 players | Match start → destroy |
| PvE dungeons | Temporary | 4-8 players | Party enters → destroy |

**Scaling**: Stateful routing via matchmaker, Redis for cross-server coordination, Nginx `ip_hash` for sticky WebSocket sessions.

> **Ref**: [Redis Game Server Architecture](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m)  
> Scaling Node.js game servers with Redis Pub/Sub.

---

## 14. Anti-Cheat & Server Authority

**The client is an untrusted input device.**

| Action | Server Checks |
|--------|---------------|
| Movement | Adjacent? Walkable? Speed ≤ max×1.1? Not stunned? |
| Spell | Exists? Owned? Off CD? GCD? Mana? Range? LOS? Not silenced? |
| Damage | **NEVER trust client.** Server calculates all. |
| Rate | Cap inputs ~30/s. Movement ~10/s. Abilities via GCD. |

---

## 15. End-to-End Data Flows

### Login → Gameplay
```
Unity → POST /auth/login → JWT + character list
     → POST /characters/:id/select → session token + WS URL
     → Open WebSocket, send JWT
     → Server validates → loads character → places in world
     → Sends: 25 chunks (~50KB) + nearby entities
     → Unity renders → in-game
```

### Combat
```
Client → {cast_spell, spellId:7, target:(5,3), seq:147}
Client shows animation (prediction)
Server validates → calculates damage → broadcasts result
All AOI clients show damage + VFX
Target dies → loot + XP → async DB write
```

---

## 16. Performance Optimization

### Node.js Server
- bitECS TypedArrays → zero GC for hot data
- `--max-semi-space-size=64` → GC CPU from ~40% to ~7%
- Worker threads for pathfinding + AI (SharedArrayBuffer)
- Binary protocol → 7-10× smaller than JSON
- Delta compression → only changed fields
- Interest management → only nearby data
- Object pools → pre-allocate everything in hot path

### Unity Client
- Tilemap pooling → reuse, never Instantiate/Destroy per chunk
- `SetTilesBlock()` → batch assignment, never individual `SetTile()`
- Chunk coroutines → max 1-2 chunk loads/frame
- Local chunk cache → Dictionary + LRU eviction
- Interpolation buffer → 2-snapshot buffer for remote entities
- Object pooling for VFX, projectiles, damage numbers

---

## 17. References & Resources

### Architecture & Game Loops
| Resource | URL |
|----------|-----|
| Fix Your Timestep! | https://gafferongames.com/post/fix_your_timestep/ |
| Overwatch GDC Netcode | https://www.youtube.com/watch?v=W3aieHjyNvw |
| Colyseus Framework | https://github.com/colyseus/colyseus |
| bitECS | https://github.com/NateTheGreatt/bitECS |
| ECS Tutorial | https://generalistprogrammer.com/tutorials/entity-component-system-complete-ecs-architecture-tutorial |

### Networking
| Resource | URL |
|----------|-----|
| Client-Side Prediction (Gambetta) | https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html |
| Reading/Writing Packets (Gaffer) | https://gafferongames.com/post/reading_and_writing_packets/ |
| Snapshot Interpolation (SnapNet) | https://snapnet.dev/blog/netcode-architectures-part-3-snapshot-interpolation/ |
| Message Serialisation (Doppnet) | https://www.doppnet.com/game-networking-message-serialisation.html |
| Netcode (Wikipedia) | https://en.wikipedia.org/wiki/Netcode |

### Tile Systems & Worlds
| Resource | URL |
|----------|-----|
| Grids and Coordinates (Red Blob) | https://www.redblobgames.com/grids/ |
| Grid Pathfinding (Red Blob) | https://www.redblobgames.com/pathfinding/grids/algorithms.html |
| Minecraft Chunk Format | https://minecraft.wiki/w/Chunk |
| Millions of Tiles (Unity) | https://discussions.unity.com/t/best-way-to-handle-millions-of-tiles/826950 |
| Spatial Partition Pattern | https://gameprogrammingpatterns.com/spatial-partition.html |
| Flow Fields for RTS | https://howtorts.github.io/2014/01/04/basic-flow-fields.html |
| 3D Grid Pathing (Gamedeveloper) | https://www.gamedeveloper.com/design/pathing-movement-on-a-3d-grid |

### Combat & Game Design
| Resource | URL |
|----------|-----|
| Unreal GAS | https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-unreal-engine-gameplay-ability-system |
| RPG Damage Formulas | https://rpg.fandom.com/wiki/Damage_Formula |
| Multiplayer Spell System | https://www.moddb.com/tutorials/designing-a-multiplayer-spell-system |

### Database & Infrastructure
| Resource | URL |
|----------|-----|
| Neon JSONB Types | https://neon.com/docs/data-types/json |
| Neon Connection Pooling | https://neon.com/docs/connect/connection-pooling |
| Postgres TOAST + JSONB | https://medium.com/@josef.machytka/how-postgresql-stores-jsonb-data-in-toast-tables-8fded495b308 |
| Materialized Views | https://smartpostgres.com/posts/using-materialized-views-to-make-queries-run-faster/ |
| AOI in MMOGs (Springer) | https://link.springer.com/10.1007/978-3-319-08234-9_239-1 |
| Turborepo Internal Packages | https://turbo.build/repo/docs/guides/tools/typescript#internal-packages |
| Redis Game Servers | https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m |
| Server Chunk Loading | https://001.arktimes.com/server-chunk-loading-how-games-handle-vast-worlds/ |

---

*This document is the single source of truth for Oven's architecture. Update it as decisions evolve.*
