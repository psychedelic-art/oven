# Map Editor

> Visual tile painting editor built with React Three Fiber, embedded in the dashboard.
> Package: `@oven/map-editor`
> Last Updated: 2026-02-11

---

## Overview

The map editor is a 2D orthographic canvas for painting tile maps. It runs inside the React Admin dashboard at route `/#/maps/:id/editor` and communicates with the server via REST API for loading/saving chunks and generating terrain.

**Key features**:
- Paint and erase tiles on an infinite canvas
- Pan and zoom with mouse controls
- Tile palette grouped by category
- Dirty chunk tracking with manual save
- Perlin noise chunk generation for discovery maps
- DataTexture rendering (one GPU texture per chunk)

---

## Package Structure

```
packages/map-editor/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                  # Public API exports
    ├── types.ts                  # Core type definitions
    ├── codec.ts                  # Base64 ↔ Uint16Array encoding
    ├── hooks/
    │   └── useMapEditor.ts       # State management hook (205 lines)
    └── components/
        ├── MapEditor.tsx          # Main wrapper (toolbar + palette + canvas)
        ├── TileMapCanvas.tsx      # R3F orthographic canvas
        ├── TilePalette.tsx        # Tile selection sidebar
        ├── EditorToolbar.tsx      # Top toolbar (tools, save, generate)
        ├── PaintLayer.tsx         # Invisible plane for pointer events
        ├── ChunkMesh.tsx          # Single chunk as DataTexture plane
        ├── ChunkGrid.tsx          # Chunk boundary lines
        └── CursorHighlight.tsx    # Hover indicator
```

**Dependencies**:
- `@react-three/fiber` — React reconciler for Three.js
- `@react-three/drei` — MapControls for camera panning
- `three` — 3D graphics (used for 2D orthographic rendering)
- Peer: React 19, MUI (for dashboard integration page)

---

## Layout

```
┌────────────────────────────────────────────────┐
│  EditorToolbar                                 │
│  [🖌️ Paint] [🧹 Erase] [✋ Pan]    [Generate] [Save] │
├──────────┬─────────────────────────────────────┤
│          │                                     │
│  Tile    │       TileMapCanvas (R3F)           │
│  Palette │                                     │
│  180px   │   ChunkMesh × N                     │
│          │   ChunkBoundaries                   │
│  grouped │   PaintLayer (invisible)            │
│  by      │   CursorHighlight                   │
│  category│                                     │
│          │                                     │
├──────────┴─────────────────────────────────────┤
│  Map info: name · mode · N chunks · seed: X    │
└────────────────────────────────────────────────┘
```

---

## Core Hook: `useMapEditor`

The `useMapEditor(options)` hook manages all editor state and operations.

### State (`MapEditorState`)

| Field | Type | Description |
|-------|------|-------------|
| `mapId` | `number \| null` | Current map being edited |
| `map` | `MapRecord \| null` | Map metadata (name, mode, seed, bounds) |
| `tiles` | `TileDef[]` | All tile definitions from server |
| `chunks` | `Map<ChunkKey, ChunkData>` | In-memory chunk data |
| `selectedTileId` | `number` | Active brush tile ID |
| `tool` | `EditorTool` | Active tool: `paint`, `erase`, `pan` |
| `chunkSize` | `number` | Tiles per chunk side (default 32) |
| `zoom` | `number` | Camera zoom level (0.1–10) |
| `loading` | `boolean` | Data loading in progress |
| `saving` | `boolean` | Save operation in progress |

### Actions

| Function | Description |
|----------|-------------|
| `loadTiles()` | Fetch all tile definitions from `GET /api/tiles` |
| `loadMap(mapId)` | Fetch map metadata + all chunks, decode into memory |
| `loadChunk(mapId, cx, cy)` | Lazy-load a single chunk (cached in ref) |
| `paintTile(worldX, worldY)` | Paint or erase tile at world coordinates |
| `ensureChunk(cx, cy)` | Create empty chunk if it doesn't exist |
| `saveDirtyChunks()` | POST all modified chunks to server |
| `generateMap(radius?)` | Trigger server-side Perlin generation |
| `setTool(tool)` | Switch active editor tool |
| `setSelectedTileId(tileId)` | Change brush tile |
| `setZoom(zoom)` | Adjust camera zoom (clamped 0.1–10) |

---

## Rendering

### ChunkMesh — DataTexture Per Chunk

Each chunk is rendered as a single Three.js plane with a `DataTexture`:

1. Build RGBA `Uint8Array` (32×32×4 = 4096 bytes)
2. Map each tile ID to its `colorHex` via precomputed color lookup
3. Create `THREE.DataTexture` with `NearestFilter` (pixel-perfect, no interpolation)
4. Render as `<mesh>` with `<planeGeometry args={[32, 32]} />`
5. Position at chunk center: `(chunkX * 32 + 16, chunkY * 32 + 16, 0)`

Special cases:
- Tile ID `0` (empty/erased) → dark gray `#1a1a2e`
- Unknown tile ID → dark magenta `#800080`
- `#RRGGBBAA` hex strings → alpha stripped to `#RRGGBB`

### ChunkBoundaries

Yellow line segments (opacity 0.3) drawn at z=0.02 around each loaded chunk's edges.

### CursorHighlight

1×1 semi-transparent plane following the mouse:
- **Green** (opacity 0.35) in paint mode
- **Red** (opacity 0.35) in erase mode
- Hidden in pan mode

---

## Interaction

### PaintLayer

An invisible 10000×10000 plane at z=-0.01 captures all pointer events:

1. `onPointerDown` → Start painting, convert `e.point` to tile coords via `Math.floor()`
2. `onPointerMove` → Continue painting while mouse is held
3. `onPointerUp` / `onPointerLeave` → Stop painting

Before painting, `ensureChunk(cx, cy)` creates an empty chunk if needed (new chunks are marked dirty immediately).

### Camera Controls (MapControls)

| Input | Action |
|-------|--------|
| Left click | Paint/Erase (if tool is paint/erase) |
| Left drag | Pan (if tool is pan) |
| Middle click/drag | Always pans |
| Right click/drag | Always pans |
| Scroll wheel | Zoom (0.1–20 range) |

Rotation is disabled (`enableRotate={false}`). Damping enabled for smooth movement.

---

## Tools

| Tool | Icon | Behavior |
|------|------|----------|
| **Paint** | 🖌️ | Places selected tile at cursor position |
| **Erase** | 🧹 | Sets tile to 0 (empty) at cursor position |
| **Pan** | ✋ | Left-click drags camera instead of painting |

**Planned** (not yet implemented): Fill (flood-fill), Select (rectangle selection), Undo/Redo.

---

## Tile Palette

Left sidebar (180px wide) showing all tile definitions grouped by `category`:

- Each tile renders as a 32×32 color swatch button
- Selected tile has white border + cyan outline
- If tile has `spritePath`, an `<img>` overlay is shown
- Tooltip: `{name} (ID: {tileId})`
- Categories shown as uppercase labels (e.g., "TERRAIN", "DECORATION")

---

## Chunk Data Encoding

The `codec.ts` module handles browser-compatible base64 encoding:

**Decode** (server → editor):
```
base64 string → atob() → Uint8Array → Uint16Array (1024 tile IDs)
```

**Encode** (editor → server):
```
Uint16Array → Uint8Array view → String.fromCharCode() → btoa() → base64
```

Each chunk: 32×32 = 1024 tiles × 2 bytes = 2048 bytes ≈ 2.7 KB base64.

Note: Server uses Node's `Buffer` for encoding; editor uses `atob`/`btoa` for browser compatibility.

---

## Dirty Chunk Tracking

1. `paintTile()` modifies the `Uint16Array` in-place and sets `chunk.dirty = true`
2. Toolbar shows orange "N unsaved chunks" indicator
3. User clicks **Save** → `saveDirtyChunks()` iterates all dirty chunks
4. Each dirty chunk: encode to base64, `POST /api/maps/:id/chunks`
5. Server upserts via `onConflictDoUpdate` (increments version)
6. Clear dirty flag, update state

There is no auto-save — the user must manually save.

---

## Discovery Map Generation

For maps with `mode: "discovery"`:

1. User clicks **Generate Chunks** button (green, only visible for discovery maps)
2. Editor calls `POST /api/maps/:id/generate?radius=2`
3. Server generates 5×5 grid (25 chunks) using Perlin noise with the map's seed
4. Generation uses world config thresholds (water < 0.3, dirt < 0.45, grass < 0.75, etc.)
5. Editor reloads the map to display newly generated chunks

For `prebuilt` maps, the Generate button is hidden — chunks are painted manually.

---

## API Integration

| Endpoint | Method | Usage |
|----------|--------|-------|
| `/api/tiles` | GET | Load all tile definitions on mount |
| `/api/maps/:id` | GET | Load map metadata |
| `/api/maps/:id/chunks` | GET | Load all existing chunks for map |
| `/api/maps/:id/chunks?chunk_x=N&chunk_y=N` | GET | Lazy-load single chunk |
| `/api/maps/:id/chunks` | POST | Save/upsert chunk (base64 layerData) |
| `/api/maps/:id/generate?radius=N` | POST | Trigger Perlin generation |

---

## Dashboard Integration

The editor is embedded in the React Admin dashboard via a custom route:

**Route**: `/#/maps/:id/editor`

**File**: `apps/dashboard/src/components/maps/MapEditorPage.tsx`

```tsx
<MapEditor mapId={mapId} apiBase="/api" />
```

The page includes a "Back to Map" header button that navigates to the map's show page. The editor fills the remaining viewport height.

**Access**: From any map's Show page, a button links to `/maps/:id/editor`.

---

## Coordinate System

```
World coordinates:  (worldX, worldY) = tile position in the infinite grid
Chunk coordinates:  (cx, cy) = Math.floor(worldX / 32)
Local coordinates:  (localX, localY) = ((worldX % 32) + 32) % 32
Array index:        idx = localY * 32 + localX
```

The `+ chunkSize) % chunkSize` handles negative coordinates correctly (e.g., tile at world X=-1 maps to local X=31 in chunk -1).
