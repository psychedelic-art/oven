import type {
  ModuleDefinition,
  ResourceConfig,
  CustomRouteConfig,
  MenuItemConfig,
} from './types';
import { eventBus } from './event-bus';
import { registrySchema } from './schema';

class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>();
  private unsubscribers = new Map<string, Array<() => void>>();

  register(mod: ModuleDefinition): void {
    if (this.modules.has(mod.name)) {
      // Already registered (hot reload / duplicate import) — skip silently
      return;
    }

    // Validate dependencies
    for (const dep of mod.dependencies ?? []) {
      if (!this.modules.has(dep)) {
        throw new Error(
          `Module "${mod.name}" requires "${dep}" but it's not registered. ` +
          `Register "${dep}" before "${mod.name}".`
        );
      }
    }

    this.modules.set(mod.name, mod);

    // Wire event listeners
    if (mod.events?.listeners) {
      const unsubs: Array<() => void> = [];
      for (const [event, handler] of Object.entries(mod.events.listeners)) {
        unsubs.push(eventBus.on(event, handler));
      }
      this.unsubscribers.set(mod.name, unsubs);
    }
  }

  unregister(name: string): void {
    // Unsubscribe event listeners
    const unsubs = this.unsubscribers.get(name);
    if (unsubs) {
      for (const unsub of unsubs) unsub();
      this.unsubscribers.delete(name);
    }
    this.modules.delete(name);
  }

  getModule(name: string): ModuleDefinition | undefined {
    return this.modules.get(name);
  }

  getAll(): ModuleDefinition[] {
    return [...this.modules.values()];
  }

  getComposedSchema(): Record<string, unknown> {
    return {
      // Registry's own tables (event_wirings, etc.)
      ...registrySchema,
      // Module tables
      ...Object.fromEntries(
        this.getAll().flatMap((m) => Object.entries(m.schema))
      ),
    };
  }

  getAllResources(): ResourceConfig[] {
    return this.getAll().flatMap((m) => m.resources);
  }

  getAllCustomRoutes(): CustomRouteConfig[] {
    return this.getAll().flatMap((m) => m.customRoutes ?? []);
  }

  getAllMenuItems(): MenuItemConfig[] {
    return this.getAll().flatMap((m) => m.menuItems ?? []);
  }

  getAllEmittedEvents(): Array<{ module: string; event: string }> {
    return this.getAll().flatMap((m) =>
      (m.events?.emits ?? []).map((event) => ({ module: m.name, event }))
    );
  }

  getAllListenedEvents(): Array<{ module: string; event: string }> {
    return this.getAll().flatMap((m) =>
      Object.keys(m.events?.listeners ?? {}).map((event) => ({ module: m.name, event }))
    );
  }

  /**
   * Get all event payload schemas from all registered modules.
   * Returns a flat map of eventName → payload schema.
   */
  getAllEventSchemas(): Record<string, Record<string, { type: string; description?: string; required?: boolean; example?: unknown }>> {
    const schemas: Record<string, Record<string, { type: string; description?: string; required?: boolean; example?: unknown }>> = {};
    for (const mod of this.getAll()) {
      if (mod.events?.schemas) {
        Object.assign(schemas, mod.events.schemas);
      }
    }
    return schemas;
  }

  /**
   * Get all API endpoints from all registered modules.
   * Scans each module's apiHandlers to discover routes and methods.
   */
  getAllApiEndpoints(): Array<{ module: string; route: string; methods: string[] }> {
    return this.getAll().flatMap((m) =>
      Object.entries(m.apiHandlers).map(([route, handlers]) => ({
        module: m.name,
        route,
        methods: Object.keys(handlers),
      }))
    );
  }

  async seedAll(db: any): Promise<void> {
    for (const mod of this.getAll()) {
      if (mod.seed) {
        await mod.seed(db);
      }
    }
  }
}

export const registry = new ModuleRegistry();
