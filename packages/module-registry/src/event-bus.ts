export type EventPayload = Record<string, unknown>;
export type EventHandler<T extends EventPayload = EventPayload> = (
  payload: T
) => Promise<void> | void;

export interface EventLog {
  event: string;
  payload: EventPayload;
  timestamp: number;
  results: Array<{ handler: string; success: boolean; error?: string }>;
}

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private log: EventLog[] = [];
  private maxLogSize = 1000;

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  async emit(event: string, payload: EventPayload): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) return;

    const entry: EventLog = {
      event,
      payload,
      timestamp: Date.now(),
      results: [],
    };

    for (const handler of handlers) {
      try {
        await handler(payload);
        entry.results.push({ handler: handler.name || 'anonymous', success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        entry.results.push({ handler: handler.name || 'anonymous', success: false, error: message });
      }
    }

    this.log.push(entry);
    if (this.log.length > this.maxLogSize) {
      this.log.splice(0, this.log.length - this.maxLogSize);
    }
  }

  getLog(limit = 50): EventLog[] {
    return this.log.slice(-limit);
  }

  clearLog(): void {
    this.log = [];
  }

  getRegisteredEvents(): string[] {
    return [...this.handlers.keys()];
  }

  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

export const eventBus = new EventBus();
