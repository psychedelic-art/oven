# Sprint 04 — Agent Loop & Coordinator

## Goal

Bring the upstream agent loop (`QueryEngine`, `Task`, `coordinator/`)
into `@oven/module-agent-core` so that OVEN's existing agent runtime
can stream multi-step plans, dispatch sub-agents, compress context,
and emit lifecycle events on the EventBus.

## Scope

- Port (do **not** vendor) the following upstream files into
  `packages/module-agent-core/src/runtime/`:
  - `QueryEngine.ts` → `runtime/query-engine.ts`
  - `Task.ts` → `runtime/task.ts`
  - `coordinator/swarm.ts` → `runtime/swarm.ts`
  - `query.ts` → `runtime/query.ts`
- Adapt them to OVEN conventions:
  - Use `import type` for type-only imports (CLAUDE.md type-imports rule).
  - Replace any singleton state with the **zustand factory + context
    provider** pattern (CLAUDE.md zustand-store-pattern).
  - Tools are resolved through `registry.getAll()` then
    `chat.actionSchemas` — never via direct imports of
    `module-claude-code` (Rule 3.1).
- Stream every major lifecycle event onto the EventBus:
  - `agent.run.started`
  - `agent.step.completed`
  - `agent.tool.requested`
  - `agent.subagent.spawned`
  - `agent.run.completed`
  - `agent.run.failed`
  - All payloads include `tenantId` and `agentRunId` (Rule 5.6).
- Persist runs in a new table `agent_runs` under `module-agent-core`
  with `tenantId` indexed (Rule 5.1).

## Out of scope

- Skills execution (sprint 05).
- Memory compression (sprint 06).
- MCP-backed tools (sprint 07).
- UI for runs (sprint 10).

## Deliverables

- The Run Console can submit a prompt and the agent loop:
  1. Plans
  2. Calls tools through the registry-discovered handlers
  3. Streams events
  4. Writes a final summary into `agent_runs.summary`

## Acceptance criteria

- [ ] Zero direct imports between `module-agent-core` and
      `module-claude-code` (verified by an ESLint
      `no-restricted-imports` rule added in this sprint).
- [ ] All zustand stores use the factory + provider pattern.
- [ ] All type imports use `import type`.
- [ ] EventBus events fire in the expected order in an integration
      test.

## Touched packages

- `packages/module-agent-core/` (extend)
- `packages/module-registry/` (small additions to expose helpers)

## Risks

- **R1**: Upstream `QueryEngine` is tightly coupled to Bun's streaming
  fetch. *Mitigation*: replace with Node's `fetch` (Node 20+) and an
  `AbortController`.
- **R2**: Sub-agent spawn assumes `Bun.spawn`. *Mitigation*: replace
  with an in-process worker pool.

## Rule references

Rule 3.1, Rule 4.1, Rule 4.2, Rule 5.1, Rule 5.6, Rule 9.1, Rule 9.2,
Rule 11.2; CLAUDE.md `zustand-store-pattern`, `type-imports`.
