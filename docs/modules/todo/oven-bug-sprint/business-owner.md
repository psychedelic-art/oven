# Business Owner — OVEN Bug Sprint

## Role

The **Business Owner (BO)** is the single point of accountability for this
project. The BO does not write code. The BO:

1. **Defines value**: which findings actually move the needle and which
   are vanity fixes. Severity is a hint, not a mandate — a low-severity
   rule violation that unlocks a follow-up feature can outrank a
   medium-severity perf nit.
2. **Proposes integrations**: after each sprint lands, the BO annotates
   this file with an **Integration Proposal** explaining which other
   OVEN module benefits, which user-visible workflow becomes viable,
   and what the next sprint's candidate is.
3. **Resolves ambiguity**: when an async run hits a fork in the road,
   the agent appends a question to § Open questions below and stops
   the sprint. The BO answers, then the next run resumes.
4. **Signs off**: each sprint has a checkbox in § Sign-off below. The
   project is only DONE when the BO checks every box.

## Integration proposals (initial)

These are the BO's opening proposals. The agent should treat them as
defaults and only deviate with a recorded reason.

### IP-1 — Bug fixes never cross module boundaries

**Why**: Rule 3.1 (no direct cross-module imports) and Rule 4 (loose
coupling) apply just as strongly to fixes as to features. If a finding
appears to require a cross-module change, it is really two findings —
the agent files a BO question and waits.

### IP-2 — No schema migrations inside this project

**Why**: This is a cleanup program, not a schema program. Findings
that need a new column or a new table (e.g. session TTL metadata)
must be recorded as a BO question, not silently migrated. The BO
decides whether to spin out a dedicated schema sprint.

### IP-3 — `module-knowledge-base` as the memory substrate

**Why**: The memory findings in Sprint 02 touch `module-chat`'s
context manager. The BO expects long-term memory work to eventually
live in `module-knowledge-base` (same rationale as
`psychedelic-claude-code-migration` IP-4). Sprint 02 fixes the
immediate bugs but does **not** introduce a parallel memory store.

### IP-4 — Handler sort-column fix extracts a shared helper

**Why**: Sprint 05 is the ideal place to extract a reusable
`getOrderColumn(table, field, allowed[])` helper into
`packages/module-ai/src/api/_utils/sort.ts`. It stays package-private
(not exported from `index.ts`) until a second module needs it, at
which point it graduates to `module-registry` under a separate task.

### IP-5 — Rule compliance sprint owns the shared `TypedFunctionField`

**Why**: If Sprint 06 finds a third `record: any` pattern, it extracts
a single `TypedFunctionField<T>` component under
`apps/dashboard/src/components/ai/_fields/`. Below three occurrences
it stays inline — no speculative abstractions.

### IP-6 — Tool-permission fix gates behind `module-roles`

**Why**: Sprint 04 F-04-02 adds permission checks to
`tool-wrapper.ts`. Reuse `checkPermission` from `module-auth` /
`module-roles`. Do **not** invent a parallel permission primitive.

### IP-7 — Workflow loop detection uses a `Set<stateId>`, not a hash

**Why**: Sprint 03 F-03-02 should replace `JSON.stringify` loop
detection with a visited-state `Set`, not a content hash. A
per-state identifier is cheap, stable, and survives refactors of
the machine context shape.

### IP-8 — Every fix has a test or a documented manual repro

**Why**: The async runner's QA phase must produce evidence. If a
unit test is infeasible (UX smoke), the commit body documents a
two-line manual repro. No fix lands without one of the two.

### IP-9 — Findings discovered mid-sprint are parked, not fixed

**Why**: Scope discipline. New findings go into
`README.md` § 3 under an **Unassigned** subsection or into a BO
question — never into the current sprint's diff.

## Open questions

> The async runner will append questions here when it hits ambiguity.
> Format: `### Q-NNN — <one-line title>` followed by context, options,
> and a `**BO answer:**` line that the BO fills in.

_(none yet)_

## Sign-off

- [ ] Sprint 00 — Triage & audit re-validation
- [ ] Sprint 01 — AI Playground UX & type safety
- [ ] Sprint 02 — Memory / context window
- [ ] Sprint 03 — Workflow engine correctness
- [ ] Sprint 04 — Chat & agent-core completion
- [ ] Sprint 05 — Handler type safety
- [ ] Sprint 06 — Cross-cutting rule compliance
- [ ] **Project DONE** — BO signature: `__________________`  Date: `__________`
