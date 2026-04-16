import { eventBus, type EventPayload } from '@oven/module-registry';

export interface RecordedEvent {
  event: string;
  payload: EventPayload;
  timestamp: number;
}

/**
 * Subscribes to a set of event names on the shared event bus and records
 * every emission in order. Since the production event bus does not support
 * a wildcard listener, the recorder takes an explicit list of events to
 * watch.
 *
 * Usage:
 *
 *   const recorder = new EventRecorder([
 *     'workflow-agents.execution.started',
 *     'workflow-agents.execution.completed',
 *   ]);
 *   // …run the thing under test…
 *   const events = recorder.getEvents();
 *   expect(events.map(e => e.event)).toEqual([
 *     'workflow-agents.execution.started',
 *     'workflow-agents.execution.completed',
 *   ]);
 *   recorder.dispose();
 */
export class EventRecorder {
  private readonly events: RecordedEvent[] = [];
  private readonly unsubscribers: Array<() => void> = [];

  constructor(watched: string[]) {
    for (const name of watched) {
      const off = eventBus.on(name, (payload) => {
        this.events.push({ event: name, payload, timestamp: Date.now() });
      });
      this.unsubscribers.push(off);
    }
  }

  getEvents(): RecordedEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
  }

  /**
   * Resolves when an event matching `name` has been recorded, or rejects
   * after `timeoutMs`. Pass a predicate to filter by payload.
   */
  waitFor(
    name: string,
    opts: { timeoutMs?: number; predicate?: (p: EventPayload) => boolean } = {},
  ): Promise<RecordedEvent> {
    const timeoutMs = opts.timeoutMs ?? 5000;
    const predicate = opts.predicate ?? (() => true);

    const existing = this.events.find((e) => e.event === name && predicate(e.payload));
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const start = Date.now();
      const off = eventBus.on(name, (payload) => {
        if (!predicate(payload)) return;
        off();
        resolve({ event: name, payload, timestamp: Date.now() });
      });
      const timer = setInterval(() => {
        if (Date.now() - start > timeoutMs) {
          off();
          clearInterval(timer);
          reject(new Error(`Timeout waiting for event "${name}" after ${timeoutMs}ms`));
        }
      }, 25);
    });
  }
}
