import { eventBus } from './event-bus';
import type { EventPayload } from './event-bus';
import { getDb } from './db';
import { eventWirings } from './schema';
import { eq, and, isNotNull } from 'drizzle-orm';

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
/** Workflow trigger record from the workflows table */
interface WorkflowTrigger {
  id: number;
  triggerEvent: string;
  triggerCondition: Record<string, unknown> | null;
  enabled: boolean;
}

/** Lazily-resolved workflow engine reference to avoid circular imports */
let _workflowEngine: any = null;
function getWorkflowEngine(): any {
  if (!_workflowEngine) {
    try {
      // Dynamic import — @oven/module-workflows may not be installed
      _workflowEngine = require('@oven/module-workflows/engine').workflowEngine;
    } catch {
      // module-workflows not available — that's OK, just skip
      _workflowEngine = null;
    }
  }
  return _workflowEngine;
}

class WiringRuntime {
  private initialized = false;
  private wiringCache: WiringRecord[] = [];
  private workflowTriggerCache: WorkflowTrigger[] = [];
  private cacheExpiry = 0;
  private cacheTtlMs = 5000; // re-read wirings every 5s

  /**
   * Initialize the runtime by hooking into the event bus.
   * Call this once after DB is ready.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Patch eventBus.emit to also check wirings + workflow triggers
    const originalEmit = eventBus.emit.bind(eventBus);
    eventBus.emit = async (event: string, payload: EventPayload) => {
      // First, run normal handlers
      await originalEmit(event, payload);
      // Then, check simple wirings
      await this.processWirings(event, payload);
      // Then, check workflow triggers
      await this.processWorkflowTriggers(event, payload);
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

  /**
   * Load workflow triggers from the workflows table (if module-workflows is installed).
   */
  private async loadWorkflowTriggers(): Promise<WorkflowTrigger[]> {
    const now = Date.now();
    if (now < this.cacheExpiry && this.workflowTriggerCache.length > 0) {
      return this.workflowTriggerCache;
    }

    try {
      const db = getDb();
      // Try to query the workflows table — it may not exist yet
      const rows = await db.execute(
        `SELECT id, trigger_event, trigger_condition, enabled
         FROM workflows
         WHERE enabled = true AND trigger_event IS NOT NULL`
      );
      this.workflowTriggerCache = (rows.rows || []).map((r: any) => ({
        id: r.id,
        triggerEvent: r.trigger_event,
        triggerCondition: r.trigger_condition,
        enabled: r.enabled,
      }));
      return this.workflowTriggerCache;
    } catch {
      // workflows table doesn't exist yet — return empty
      this.workflowTriggerCache = [];
      return [];
    }
  }

  /**
   * Check if any workflows should be triggered by this event.
   */
  private async processWorkflowTriggers(
    event: string,
    payload: EventPayload
  ): Promise<void> {
    const engine = getWorkflowEngine();
    if (!engine) return; // module-workflows not installed

    const triggers = await this.loadWorkflowTriggers();
    const matching = triggers.filter((w) => w.triggerEvent === event);

    for (const trigger of matching) {
      // Check trigger condition
      if (
        trigger.triggerCondition &&
        !matchesCondition(payload, trigger.triggerCondition as Record<string, unknown>)
      ) {
        continue;
      }

      try {
        const executionId = await engine.executeWorkflow(
          trigger.id,
          payload,
          event
        );
        console.log(
          `[WiringRuntime] Workflow ${trigger.id} triggered by ${event} → execution ${executionId}`
        );
      } catch (err) {
        console.error(
          `[WiringRuntime] Error triggering workflow ${trigger.id}:`,
          err
        );
      }
    }
  }
}

export const wiringRuntime = new WiringRuntime();
