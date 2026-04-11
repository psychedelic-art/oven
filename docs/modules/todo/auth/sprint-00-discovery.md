# Sprint 00 — Discovery & audit

## Goal

Produce a frozen inventory of every file in `apps/dashboard/**` and
`packages/**` that currently imports an auth primitive directly
(`jsonwebtoken`, `next-auth`, `argon2`, `bcrypt`, `hash-wasm`, or
reads `Authorization` / `X-API-Key` / `X-Tenant-Id` headers inline),
so that sprint-04 has an exact cut-over list.

## Scope

- `grep -R "from 'next-auth'"` across `apps/**` and `packages/**`.
- `grep -R "from 'jsonwebtoken'"` across the same paths.
- `grep -R "argon2|bcrypt|hash-wasm"` across the same paths.
- `grep -R "X-API-Key|X-Session-Token|X-Tenant-Id|Authorization:"`
  in handler files.
- Classify each hit as:
  - `call-site` — direct handler that will migrate to
    `getAuthContext(request)`.
  - `lib` — a shared helper; may move into `packages/module-auth/`.
  - `test-only` — test fixture, keep as-is.
- Write `docs/modules/todo/auth/inventory.md` with one row per hit:
  `File:Line · Import/header · Classification · Notes`.
- Record the `HEAD` SHA of `dev` at the top of `inventory.md` for
  drift detection.

## Out of scope

- Any code change.
- Decisions about how each handler will migrate — that is sprint-04.
- Choosing the rate-limit backend — that is sprint-01.

## Deliverables

- `docs/modules/todo/auth/inventory.md` with 100% coverage.
- `STATUS.md` row for sprint-00 flipped to `Done`.
- Sprint files 01–04 updated with any inventory IDs they depend on
  (cross-reference by `AUTH-INV-NN`).

## Acceptance criteria

- [ ] `inventory.md` covers 100% of greps listed in Scope.
- [ ] Every row has a classification.
- [ ] Every `call-site` row has a "target sprint" column pointing at
      sprint-01, sprint-02, sprint-03, or sprint-04.
- [ ] `HEAD` SHA of `dev` is recorded at the top of `inventory.md`.
- [ ] No source file is modified.

## Touched packages

_None._ This sprint is documentation only.

## Risks

- **R1**: Hidden auth primitives inside `.handler.ts` files the grep
  misses because they re-export indirectly. *Mitigation*: also grep
  for `decode(`, `encode(`, `sign(`, `verify(`, `hash(` with the
  relevant imports.
- **R2**: `argon2` is imported by a dev-only tool. *Mitigation*: the
  `test-only` classification handles this — such imports do not
  migrate.

## Rule compliance checklist

- `docs/module-rules.md` — discovery; no rule violations possible.
- `CLAUDE.md` — documentation only; no inline styles, no untyped
  imports introduced.
- Canonical doc shape — this sprint targets `docs/modules/todo/auth/`
  only; `docs/modules/auth/` is unchanged.
