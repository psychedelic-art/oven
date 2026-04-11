import { eventBus } from '@oven/module-registry';

// ─── Cost Entry ─────────────────────────────────────────────

export interface CostEntry {
  nodeId: string;
  nodeType: string;
  tokens: { input: number; output: number; total: number };
  costCents: number;
}

// ─── Execution Cost Summary ─────────────────────────────────

export interface ExecutionCostSummary {
  executionId: number;
  entries: CostEntry[];
  totalTokens: { input: number; output: number; total: number };
  totalCostCents: number;
}

// ─── Cost Tracker ───────────────────────────────────────────
// Accumulates token usage and cost across node executions within a workflow run.

export class CostTracker {
  private executionId: number;
  private entries: CostEntry[] = [];

  constructor(executionId: number) {
    this.executionId = executionId;
  }

  // Record a node's token usage and cost
  record(entry: CostEntry): void {
    this.entries.push(entry);
  }

  // Extract cost data from a node output (if it contains tokens/cost fields)
  recordFromOutput(nodeId: string, nodeType: string, output: Record<string, unknown>): void {
    const tokens = output.tokens as { input?: number; output?: number; total?: number } | undefined;
    if (!tokens) return;

    this.entries.push({
      nodeId,
      nodeType,
      tokens: {
        input: tokens.input ?? 0,
        output: tokens.output ?? 0,
        total: tokens.total ?? 0,
      },
      costCents: (output.costCents as number) ?? 0,
    });
  }

  // Get the current summary
  getSummary(): ExecutionCostSummary {
    const totalTokens = this.entries.reduce(
      (acc, e) => ({
        input: acc.input + e.tokens.input,
        output: acc.output + e.tokens.output,
        total: acc.total + e.tokens.total,
      }),
      { input: 0, output: 0, total: 0 },
    );

    const totalCostCents = this.entries.reduce((acc, e) => acc + e.costCents, 0);

    return {
      executionId: this.executionId,
      entries: this.entries,
      totalTokens,
      totalCostCents,
    };
  }

  // Emit cost update event
  async emitCostUpdate(): Promise<void> {
    const summary = this.getSummary();
    await eventBus.emit('workflow-agents.cost.updated', {
      executionId: this.executionId,
      totalTokens: summary.totalTokens,
      totalCostCents: summary.totalCostCents,
    });
  }
}
