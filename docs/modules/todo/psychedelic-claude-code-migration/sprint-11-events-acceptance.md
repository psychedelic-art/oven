# Sprint 11 — Events, Telemetry & Acceptance

## Goal

Wire the new modules into the EventBus / wiring system, hook the
upstream OpenTelemetry instrumentation into OVEN's existing telemetry
pipeline, and ship the project's end-to-end acceptance test.

## Scope

- Confirm every event schema is registered (Rule 2.3) for all
  events emitted in sprints 02–08:
  - `claude-code.tool.invoked`
  - `claude-code.command.invoked`
  - `agent.run.*`, `agent.step.*`, `agent.tool.*`, `agent.subagent.*`
  - `skills.skill.*`, `skills.execution.*`
- Add an example wiring stored in `event_wirings`:
  - **When** `agent.run.failed` **fires** → **emit**
    `notifications.message.send` with a templated body. This proves
    the cross-module integration works without direct imports.
- OpenTelemetry:
  - Lift the upstream tracing setup into a thin
    `packages/module-claude-code/src/telemetry.ts` that uses the
    OVEN-wide OTEL exporter (do not introduce a new exporter).
  - Spans: `agent.run`, `agent.step`, `tool.invoke`, `skill.execute`.
- Acceptance test (`apps/dashboard/__tests__/claude-code.e2e.ts`):
  1. Seed a fresh tenant.
  2. Create a session.
  3. Run `/commit` against a fixture repo — workflow executes.
  4. Run an agent prompt that requires the `Read` and `Edit` tools.
  5. Assert: rows exist in `claude_code_tool_invocations`,
     `agent_runs`, and `kb_entries` (memory namespace).
  6. Assert: events were emitted in the expected order.
  7. Assert: a different tenant cannot read any of the above
     (RLS sanity check).
- Add `docs/modules/22-claude-code.md` documenting the final shape
  of the integrated module (mirroring the format of
  `docs/modules/19-ui-flows.md`).

## Out of scope

- Production rollout / feature flag flip.
- Load testing.

## Deliverables

- `pnpm -w turbo run lint typecheck build test` is green.
- `apps/dashboard` boots cleanly.
- E2E test passes locally and in CI.
- `docs/modules/22-claude-code.md` exists and is linked from the
  module index.
- BO has signed off in `business-owner.md` § Sign-off.

## Acceptance criteria

- [ ] Every event in `events.emits` has a schema in `events.schemas`
      (Rule 2.3).
- [ ] No direct cross-module imports anywhere (verified by ESLint
      `no-restricted-imports` rule added in sprint 04).
- [ ] All checklist items at the end of `docs/module-rules.md` pass
      for `module-claude-code`, `module-skills`, and the agent-core
      extensions.

## Touched packages

- All new modules (read-only or small fixes).
- `apps/dashboard/`
- `docs/modules/`

## Risks

- **R1**: Hidden Bun-isms found late. *Mitigation*: a final
  `grep -R 'Bun\.' packages/` step is part of the sprint exit gate.

## Rule references

Rule 2.3, Rule 9.1, Rule 9.2, Rule 9.3, Rule 9.4, plus the full
"Before merging a new module" checklist from `docs/module-rules.md`.
