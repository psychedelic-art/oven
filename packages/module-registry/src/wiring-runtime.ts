import { eventBus } from './event-bus';
import type { EventPayload } from './event-bus';
import { getDb } from './db';
import { eventWirings } from './schema';
import { eq, and } from 'drizzle-orm';

export interface WiringRecord {
  id: number;
  sourceModule: string;
  sourceEvent: string;
  targetModule: string;
  targetAction: string;
  transform: Record<string, unknown> | null;
  condition: Record<string, unknown> | null;
  label: string | null;
  description: string | null;
  enabled: boolean;
}

/**
 * Apply a simple transform map to a payload.
 * Transform format: { "newKey": "$.originalKey" }
 * Supports simple dot-path extraction: "$.foo.bar" → payload.foo.bar
 */
function applyTransform(
  payload: EventPayload,
  transform: Record<string, unknown>
): EventPayload {
  const result: EventPayload = {};
  for (const [key, expr] of Object.entries(transform)) {
    if (typeof expr === 'string' && expr.startsWith('$.')) {
      const path = expr.slice(2).split('.');
      let value: unknown = payload;
      for (const segment of path) {
        if (value && typeof value === 'object' && segment in value) {
          value = (value as Record<string, unknown>)[segment];
        } else {
          value = undefined;
          break;
        }
      }
      result[key] = value;
    } else {
      // Static value
      result[key] = expr;
    }
  }
  return result;
}

/**
 * Check if a payload matches a simple condition.
 * Condition format: { "key": "expectedValue" }
 * All conditions must match (AND logic).
 */
function matchesCondition(
  payload: EventPayload,
  condition: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    if (payload[key] !== expected) return false;
  }
  return true;
}

/**
 * The wiring runtime listens for ALL events on the bus and checks
 * if any DB-stored wirings should fire for that event.
 * Target actions are emitted as new events: "{targetModule}.{targetAction}"
 */
class WiringRuntime {
  private initialized = false;
  private wiringCache: WiringRecord[] = [];
  private cacheExpiry = 0;
  private cacheTtlMs = 5000; // re-read wirings every 5s

  /**
   * Initialize the runtime by hooking into the event bus.
   * Call this once after DB is ready.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Patch eventBus.emit to also check wirings
    const originalEmit = eventBus.emit.bind(eventBus);
    eventBus.emit = async (event: string, payload: EventPayload) => {
      // First, run normal handlers
      await originalEmit(event, payload);
      // Then, check wirings
      await this.processWirings(event, payload);
    };
  }

  /**
   * Load wirings from DB (cached for performance).
   */
  private async loadWirings(): Promise<WiringRecord[]> {
    const now = Date.now();
    if (now < this.cacheExpiry && this.wiringCache.length > 0) {
      return this.wiringCache;
    }

    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(eventWirings)
        .where(eq(eventWirings.enabled, true));
      this.wiringCache = rows as WiringRecord[];
      this.cacheExpiry = now + this.cacheTtlMs;
      return this.wiringCache;
    } catch {
      // DB not ready or table doesn't exist yet — return empty
      return [];
    }
  }

  /**
   * Invalidate the cache (call after CRUD operations on wirings).
   */
  invalidateCache(): void {
    this.cacheExpiry = 0;
  }

  /**
   * Process wirings for a given event.
   */
  private async processWirings(
    event: string,
    payload: EventPayload
  ): Promise<void> {
    const wirings = await this.loadWirings();
    const matching = wirings.filter((w) => w.sourceEvent === event);

    for (const wiring of matching) {
      // Check condition
      if (
        wiring.condition &&
        !matchesCondition(payload, wiring.condition as Record<string, unknown>)
      ) {
        continue;
      }

      // Apply transform
      let targetPayload = payload;
      if (wiring.transform) {
        targetPayload = applyTransform(
          payload,
          wiring.transform as Record<string, unknown>
        );
      }

      // Emit the target action as a new event
      const targetEvent = `${wiring.targetModule}.${wiring.targetAction}`;
      try {
        // Use original emit to avoid infinite recursion from wirings
        const handlers = (eventBus as any).handlers?.get(targetEvent);
        if (handlers && handlers.size > 0) {
          for (const handler of handlers) {
            try {
              await handler(targetPayload);
            } catch (err) {
              console.error(
                `[WiringRuntime] Handler error for ${targetEvent}:`,
                err
              );
            }
          }
        }
        console.log(
          `[WiringRuntime] Wiring fired: ${event} → ${targetEvent}`,
          wiring.label ?? ''
        );
      } catch (err) {
        console.error(
          `[WiringRuntime] Error executing wiring ${wiring.id}:`,
          err
        );
      }
    }
  }
}

export const wiringRuntime = new WiringRuntime();
