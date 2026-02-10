# Package Composition Pattern — Research & Rationale

> **Purpose**: Document the technical research behind Oven's modular plugin architecture.
> **Date**: 2026-02-09

---

## 1. The Problem

Game backends are typically monolithic: a single app with all schemas, routes, and UI pages intertwined. Adding a new feature (inventory, guilds, matchmaking) means touching shared files, risking regressions, and making the codebase harder to navigate.

**Goal**: Each feature is a self-contained package that can be developed, tested, and deployed independently — then composed into a running application at the edges.

---

## 2. Pattern: Package Composition with Module Registry

### Core Idea

Each module is a TypeScript package that exports a standardized `ModuleDefinition` object. A central `ModuleRegistry` collects all definitions and provides composed views (merged schema, aggregated resources, etc.). The host application (Next.js dashboard) reads from the registry to wire everything together.

### Why This Over Alternatives

| Approach | Verdict | Why |
|----------|---------|-----|
| **Package Composition** (chosen) | Best fit | Each module is just a package. No runtime overhead. Full type safety. Works with existing tools. |
| **Micro-frontends (Module Federation)** | Overkill | Adds webpack/rspack complexity. Designed for independently deployed UIs. We deploy as one app. |
| **Custom route loader** | Fragile | Next.js App Router requires physical route files. Dynamic loaders break build-time optimizations. |
| **Plugin system (load at runtime)** | Too complex | Dynamic imports, plugin lifecycle, hot-reload — all unnecessary when we control the monorepo. |
| **Monolith with folders** | Too coupled | "modules" as folders share DB connections, types, and imports. Extracting later is painful. |

---

## 3. Key Technical Findings

### 3.1 Next.js App Router: No Dynamic Route Mounting

**Finding**: Next.js App Router requires physical files in the `app/` directory for each route. There is no API to programmatically register routes at runtime.

**Solution**: Thin re-export files. Each module's API handlers are full functions that accept `NextRequest` and return `NextResponse`. The dashboard creates one-liner files that re-export them:

```typescript
// apps/dashboard/src/app/api/tiles/route.ts
export { GET, POST } from '@oven/module-maps/api/tiles.handler';
```

**Trade-off**: Adding a new module requires adding re-export files manually (or via a codegen script). For 2-5 modules, manual is fine. Beyond that, a script that reads module manifests and generates route files would help.

### 3.2 React Admin: Resource Composition is First-Class

**Finding**: React Admin's `<Resource>` component accepts props that can be spread from external objects. This is the intended pattern for dynamic resource registration.

```tsx
// Each module exports resource configs
const mapsResources = [
  { name: 'tiles', list: TileList, edit: TileEdit, create: TileCreate },
  { name: 'world-configs', list: ConfigList, edit: ConfigEdit },
];

// Dashboard spreads them
{registry.getAllResources().map(r => <Resource key={r.name} {...r} />)}
```

**Source**: React Admin docs confirm this pattern works. Resources are just React components with props.

### 3.3 Drizzle ORM: Internal Packages Required

**Finding**: Drizzle ORM uses a branded type (`IsDrizzleTable`) on table definitions. When a package is compiled (e.g., via `tsc` to `dist/`), the branded type metadata is lost. This causes `drizzle()` to silently ignore tables from compiled packages.

**Solution**: Use Turborepo "internal packages" — packages that export raw TypeScript (`"main": "./src/index.ts"`) and are transpiled by the consuming app via `transpilePackages` in `next.config.ts`.

```json
// packages/module-maps/package.json
{
  "name": "@oven/module-maps",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

```typescript
// apps/dashboard/next.config.ts
const nextConfig = {
  transpilePackages: ['@oven/module-registry', '@oven/module-maps', '@oven/module-players'],
};
```

**Source**: Turborepo docs on internal packages. Drizzle GitHub issues on monorepo schema composition.

### 3.4 Schema Composition: Merge at App Level

**Finding**: Drizzle Kit (for migrations) requires a single schema object with all tables. This must happen at the app level where all modules are imported.

```typescript
// apps/dashboard/drizzle.config.ts
import { mapsSchema } from '@oven/module-maps/schema';
import { playersSchema } from '@oven/module-players/schema';

export default {
  schema: { ...mapsSchema, ...playersSchema },
  // ...
};
```

The registry's `getComposedSchema()` method does the same thing at runtime for the `drizzle()` call.

### 3.5 Cross-Module Dependencies

**Finding**: Some tables reference tables from other modules (e.g., `player_sessions.map_id` → `maps.id`). Drizzle handles this via raw SQL references rather than TypeScript foreign key helpers, since the referenced table is in a different package.

```typescript
// module-players/src/schema.ts
map_id: integer('map_id'),  // FK to maps.id — enforced at DB level, not Drizzle level
```

The `ModuleDefinition.dependencies` array ensures registration order is correct.

### 3.6 Neon Serverless Driver

**Finding**: For serverless environments (Vercel), Neon's HTTP driver (`@neondatabase/serverless`) provides lower latency than traditional TCP connections because it avoids connection setup overhead.

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
```

---

## 4. Module Contract Design

### Why a Single Export Object

Each module exports ONE object (`ModuleDefinition`) instead of multiple exports because:

1. **Validation**: The registry can validate the entire module at registration time
2. **Discovery**: No need to scan for multiple entry points
3. **Documentation**: The interface IS the documentation
4. **Type safety**: TypeScript enforces completeness

### ModuleDefinition Interface

```typescript
interface ModuleDefinition {
  // Identity
  name: string;                        // Unique: "maps", "players"
  dependencies?: string[];             // Modules this requires

  // Database
  schema: Record<string, unknown>;     // Drizzle table exports
  seed?: (db: DbClient) => Promise<void>;

  // API
  apiHandlers: ApiHandlerMap;          // Route → { GET?, POST?, PUT?, DELETE? }

  // UI
  resources: ResourceConfig[];         // React Admin CRUD resources
  customRoutes?: CustomRouteConfig[];  // Custom pages
  menuItems?: MenuItemConfig[];        // Sidebar entries
}

type ApiHandlerMap = Record<string, Record<string, RouteHandler>>;
type RouteHandler = (req: NextRequest) => Promise<NextResponse>;
```

### Registry Singleton

```typescript
class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>();

  register(mod: ModuleDefinition): void {
    // Validate dependencies exist
    for (const dep of mod.dependencies ?? []) {
      if (!this.modules.has(dep))
        throw new Error(`Module "${mod.name}" requires "${dep}" but it's not registered`);
    }
    this.modules.set(mod.name, mod);
  }

  getComposedSchema(): Record<string, unknown> {
    return Object.fromEntries(
      [...this.modules.values()].flatMap(m => Object.entries(m.schema))
    );
  }

  getAllResources(): ResourceConfig[] {
    return [...this.modules.values()].flatMap(m => m.resources);
  }

  getModule(name: string): ModuleDefinition | undefined {
    return this.modules.get(name);
  }

  getAll(): ModuleDefinition[] {
    return [...this.modules.values()];
  }
}

export const registry = new ModuleRegistry();
```

---

## 5. SOLID Principles Applied

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each module owns exactly one domain (maps, players) |
| **Open/Closed** | Dashboard is open for extension (register new module) but closed for modification (no existing code changes) |
| **Liskov Substitution** | All modules implement `ModuleDefinition` — any module can be swapped |
| **Interface Segregation** | `ModuleDefinition` has optional fields (seed, customRoutes, menuItems) — modules only implement what they need |
| **Dependency Inversion** | Dashboard depends on `ModuleDefinition` interface, not concrete modules. DB client is injected, not imported. |

---

## 6. Data Flow: Adding a New Module

```
Developer creates packages/module-inventory/
  │
  ├── schema.ts     → Drizzle tables (items, inventories)
  ├── api/          → Route handlers
  ├── admin/        → React Admin components
  └── index.ts      → exports inventoryModule: ModuleDefinition
         │
         ▼
apps/dashboard/src/lib/modules.ts
  + import { inventoryModule } from '@oven/module-inventory';
  + registry.register(inventoryModule);
         │
         ▼
apps/dashboard/src/app/api/items/route.ts  (new file)
  export { GET, POST } from '@oven/module-inventory/api/items.handler';
         │
         ▼
npx drizzle-kit push   → Creates new tables
         │
         ▼
Done. Dashboard shows inventory resources automatically.
```

---

## 7. React Admin Data Provider Pattern

React Admin requires a `dataProvider` that translates CRUD operations to API calls. For our REST API pattern with Content-Range headers:

```typescript
// apps/dashboard/src/providers/dataProvider.ts
import simpleRestProvider from 'ra-data-simple-rest';

export const dataProvider = simpleRestProvider('/api');
```

The `ra-data-simple-rest` provider expects:
- `GET /api/{resource}` → list with `Content-Range` header
- `GET /api/{resource}/{id}` → single record
- `POST /api/{resource}` → create
- `PUT /api/{resource}/{id}` → update
- `DELETE /api/{resource}/{id}` → delete

Our API handlers follow this exact convention. The `api-utils.ts` in module-registry provides `parseListParams()` and `buildContentRange()` helpers.

---

## 8. Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | pnpm + Turborepo | Fast, proven for TypeScript monorepos |
| Database | Neon Postgres (serverless) | Auto-scaling, branching, HTTP driver |
| ORM | Drizzle | Type-safe, lightweight, raw SQL when needed |
| API | Next.js App Router | Serverless-ready, React co-located |
| Admin UI | React Admin | Mature CRUD framework, composable resources |
| Styling | Tailwind CSS | Utility-first, works with React Admin's MUI |
| Game Client | Unity 2D URP | Existing tile world system (25 C# files) |

---

*This document captures research findings. See `package-composition-plan.md` for the implementation plan.*
