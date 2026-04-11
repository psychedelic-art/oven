import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];
let updateResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(updateResult)),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import {
  saveCheckpoint,
  loadCheckpoint,
  resumeFromCheckpoint,
  transitionStatus,
} from '../engine/checkpoint-manager';
import { eventBus } from '@oven/module-registry';

describe('CheckpointManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    updateResult = [];
  });

  describe('saveCheckpoint()', () => {
    it('saves checkpoint with current state and context', async () => {
      updateResult = [{ id: 1, status: 'paused', checkpoint: { currentState: 'review', context: { data: 'test' } } }];
      const result = await saveCheckpoint(1, {
        currentState: 'review',
        context: { data: 'test' },
        stepsExecuted: 3,
        pendingInput: { proposal: 'Schedule appointment' },
      });
      expect(result).not.toBeNull();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'workflow-agents.checkpoint.saved',
        expect.objectContaining({ executionId: 1 }),
      );
    });
  });

  describe('loadCheckpoint()', () => {
    it('loads checkpoint from execution record', async () => {
      selectResult = [{
        id: 1, status: 'paused',
        checkpoint: { currentState: 'review', context: { data: 'test' }, stepsExecuted: 3 },
      }];
      const cp = await loadCheckpoint(1);
      expect(cp).not.toBeNull();
      expect(cp!.currentState).toBe('review');
      expect(cp!.context.data).toBe('test');
    });

    it('returns null for execution without checkpoint', async () => {
      selectResult = [{ id: 1, status: 'running', checkpoint: null }];
      const cp = await loadCheckpoint(1);
      expect(cp).toBeNull();
    });

    it('returns null for non-existent execution', async () => {
      selectResult = [];
      const cp = await loadCheckpoint(999);
      expect(cp).toBeNull();
    });
  });

  describe('transitionStatus()', () => {
    it('allows running → paused', async () => {
      selectResult = [{ id: 1, status: 'running' }];
      updateResult = [{ id: 1, status: 'paused' }];
      const result = await transitionStatus(1, 'paused');
      expect(result.success).toBe(true);
    });

    it('allows paused → running (resume)', async () => {
      selectResult = [{ id: 1, status: 'paused' }];
      updateResult = [{ id: 1, status: 'running' }];
      const result = await transitionStatus(1, 'running');
      expect(result.success).toBe(true);
    });

    it('allows running → cancelled', async () => {
      selectResult = [{ id: 1, status: 'running' }];
      updateResult = [{ id: 1, status: 'cancelled' }];
      const result = await transitionStatus(1, 'cancelled');
      expect(result.success).toBe(true);
    });

    it('rejects completed → running (invalid)', async () => {
      selectResult = [{ id: 1, status: 'completed' }];
      const result = await transitionStatus(1, 'running');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('rejects cancelled → running (invalid)', async () => {
      selectResult = [{ id: 1, status: 'cancelled' }];
      const result = await transitionStatus(1, 'running');
      expect(result.success).toBe(false);
    });

    it('emits status change event', async () => {
      selectResult = [{ id: 1, status: 'running' }];
      updateResult = [{ id: 1, status: 'cancelled' }];
      await transitionStatus(1, 'cancelled');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'workflow-agents.execution.cancelled',
        expect.objectContaining({ executionId: 1 }),
      );
    });
  });

  describe('resumeFromCheckpoint()', () => {
    it('loads checkpoint and returns resume data', async () => {
      selectResult = [{
        id: 1, status: 'paused',
        checkpoint: { currentState: 'humanReview', context: { proposal: 'test' }, stepsExecuted: 5, pendingInput: {} },
      }];
      const resume = await resumeFromCheckpoint(1, { decision: 'approve', feedback: 'Looks good' });
      expect(resume).not.toBeNull();
      expect(resume!.currentState).toBe('humanReview');
      expect(resume!.resumeInput.decision).toBe('approve');
    });

    it('returns null if execution is not paused', async () => {
      selectResult = [{ id: 1, status: 'running', checkpoint: null }];
      const resume = await resumeFromCheckpoint(1, {});
      expect(resume).toBeNull();
    });
  });
});
