# Agent UI — Agent prompts

`@oven/agent-ui` is a pure UI package. It owns no system prompts and
no LLM calls of its own. The "prompts" it cares about live in the
backend modules it consumes (`module-agent-core`,
`module-workflow-agents`). This document captures the developer
prompts we use to evolve the package itself, so that a long-running
agent can pick up any piece of the backlog without rereading the
full spec.

---

## 1. Sprint kickoff prompt

Use this when starting a new sprint on `@oven/agent-ui`.

> You are working on `@oven/agent-ui`. Read
> `docs/modules/agent-ui/module-design.md` **before writing any
> code**. Respect the hard invariants: no MUI imports, no inline
> styles, `cn()` for className composition, `import type` for
> type-only imports, error handling only at boundaries
> (`useChat`, `useTenantConfig`, `useSessionPersistence`,
> `src/entry/widget.ts`).
>
> Your sprint goal is `{sprint.goal}`. The acceptance criteria and
> requirement IDs are in `docs/modules/todo/agent-ui/{sprint-file}.md`.
> Every requirement you satisfy must be ticked in the sprint file's
> acceptance checklist in the same commit.
>
> Tests live in `packages/agent-ui/src/__tests__/`. Use `vitest` +
> `@testing-library/react` + `jsdom`. Every new hook that owns a
> derivation or state machine MUST have a `*.test.ts` file. Every
> new component whose wiring is non-trivial MUST have a
> `*.test.tsx` file.
>
> When you are done, run `pnpm --filter @oven/agent-ui test`, then
> `pnpm --filter @oven/agent-ui typecheck`, and only report the
> sprint as done if both are green.

---

## 2. Bug-fix prompt

Use this when triaging a widget bug.

> You are fixing a bug in `@oven/agent-ui`. Do not add any new
> features, refactor adjacent code, or change the public API
> surface unless the bug requires it. Follow the CLAUDE.md rule:
> "Don't add features beyond what was asked."
>
> Reproduce the bug with a failing test in `__tests__/` FIRST. Only
> then touch the implementation. Commit the failing test and the
> fix together so the commit is self-documenting.
>
> If the bug is in the widget runtime, test it in `jsdom`. If it
> is in the visual rendering, update a `*.test.tsx` file using
> `@testing-library/react` queries. If it is in the standalone
> widget bundle (script-tag embed), test it by hand against
> `dist/chat-widget.js` and document the manual steps in the PR
> description.

---

## 3. Accessibility sprint prompt

Use this for the A11Y sprint referenced in
`detailed-requirements.md` §R11.

> Your goal is to make `@oven/agent-ui` WCAG 2.1 AA compliant.
> Scope:
>
> 1. Every interactive element has an accessible name (`aria-label`,
>    `aria-labelledby`, or visible label).
> 2. Full keyboard navigation through the playground: Tab order,
>    Enter to submit, Esc to dismiss palette, Arrow nav in sidebar.
> 3. Streaming token updates are announced to screen readers via a
>    polite live region — not assertive, which would interrupt the
>    user.
> 4. Colour contrast meets WCAG AA for every theme preset. Use
>    `axe-core` to verify automated rules; do manual contrast
>    checks on the Midnight and Clinical presets.
>
> Do not change the visual design. Do not introduce new components.
> Only add `aria-*` attributes, `role` attributes, keyboard
> handlers, and (where absolutely needed) hidden text nodes for
> screen readers.
>
> Tests: add `*.a11y.test.tsx` files that run `axe-core` via
> `vitest-axe` against each component. Keep the existing
> `UnifiedAIPlayground.test.tsx` green.

---

## 4. Standalone bundle refresh prompt

Use this when something changes in the widget entry path.

> You are refreshing the standalone widget bundle at
> `dist/chat-widget.js`.
>
> Run `pnpm --filter @oven/agent-ui build:widget`. Verify the
> output is a single self-contained file (no external imports at
> runtime), CSS is either inlined or in a sibling `.css` file,
> and the total bundle size has not regressed by more than 10%
> versus the previous release.
>
> Test the bundle by creating a minimal `.html` with a
> `<script data-tenant="..." src="..."></script>` tag and loading
> it in Chromium + Firefox + Safari. Confirm:
>
> 1. The widget mounts without errors.
> 2. `localStorage` persistence works.
> 3. Business-hours welcome is correct for the tenant's timezone.
> 4. Streaming responses render token-by-token.
> 5. The widget does not leak styles onto the host page.
>
> If a host-page style conflict appears, use shadow DOM (guarded
> by `data-shadow="true"`) or add a higher-specificity scoped
> selector — never `!important`.

---

## 5. Upstream-module contract-change prompt

Use this when `module-chat`, `module-tenants`, `module-agent-core`,
or `module-workflow-agents` changes an endpoint the UI consumes.

> An upstream module changed a contract that `@oven/agent-ui`
> reads. Your job is to keep the UI working without hiding the
> breakage.
>
> Steps:
>
> 1. Find every call site in `src/hooks/` that touches the
>    changed endpoint. Update the TypeScript types first.
> 2. Update `docs/modules/agent-ui/api.md` to match the new
>    contract. That file is the single source of truth for
>    consumed endpoints; every mismatch there is a bug.
> 3. Update the failing test (or add one) that pins the new
>    shape.
> 4. Verify that the dashboard `/ai-playground` route and the
>    portal chat page renderer still compile and still exercise
>    the happy path.
> 5. Do not introduce a backwards-compatibility shim. Per
>    `CLAUDE.md`, "Don't use feature flags or
>    backwards-compatibility shims when you can just change the
>    code."
