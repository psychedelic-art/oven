/**
 * Harness self-test: verifies `EventRecorder` captures events emitted
 * through the production `eventBus` singleton and supports the
 * `waitFor(name, predicate)` helper used by workflow e2e tests.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { eventBus } from '@oven/module-registry';
import { EventRecorder } from '../src';

describe('e2e: event-recorder', () => {
  let recorder: EventRecorder | null = null;

  afterEach(() => {
    recorder?.dispose();
    recorder = null;
  });

  it('captures events emitted via the shared bus in order', async () => {
    recorder = new EventRecorder([
      'workflow-agents.execution.started',
      'workflow-agents.execution.completed',
    ]);

    await eventBus.emit('workflow-agents.execution.started', { runId: 1 });
    await eventBus.emit('workflow-agents.execution.completed', { runId: 1, status: 'ok' });

    const events = recorder.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe('workflow-agents.execution.started');
    expect(events[0].payload).toEqual({ runId: 1 });
    expect(events[1].event).toBe('workflow-agents.execution.completed');
  });

  it('ignores events not on the watched list', async () => {
    recorder = new EventRecorder(['a']);
    await eventBus.emit('a', { x: 1 });
    await eventBus.emit('b', { x: 2 });

    const events = recorder.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('a');
  });

  it('waitFor resolves once a matching event is emitted', async () => {
    recorder = new EventRecorder([]);

    const pending = recorder.waitFor('agents.execution.completed', {
      predicate: (p) => p.runId === 7,
      timeoutMs: 1000,
    });

    // Emit an unrelated event first — should not resolve.
    await eventBus.emit('agents.execution.completed', { runId: 6 });
    await eventBus.emit('agents.execution.completed', { runId: 7, status: 'ok' });

    const ev = await pending;
    expect(ev.payload).toEqual({ runId: 7, status: 'ok' });
  });

  it('waitFor rejects on timeout', async () => {
    recorder = new EventRecorder([]);
    await expect(
      recorder.waitFor('never.happens', { timeoutMs: 100 }),
    ).rejects.toThrow(/Timeout/);
  });
});
