# Module Auth — References

External production-grade references that informed the design.
Every reference was sanity-checked against the ground-truth rules and
the Next.js 15 / React 19 stack before being accepted.

## Libraries

- **NextAuth (Auth.js)** — session + JWT flow for Next.js 15.
  <https://authjs.dev/> — used by the MVP `@oven/auth-authjs` adapter.
  Accepted because it ships the encode/decode primitives we need
  behind a stable interface and handles cookie semantics consistently
  with the App Router.
- **hash-wasm** — WASM-backed Argon2id implementation with zero
  native deps. <https://github.com/Daninet/hash-wasm> — picked over
  `argon2` (native) to keep the dashboard buildable on Alpine-based
  CI runners.
- **panva/jose** — JWT encode/decode in WebCrypto; reserved as a
  fallback if NextAuth's primitives regress.

## Patterns and prior art

- **Adapter registry matching `module-notifications`** — ensures a
  single, visually identical pattern across every multi-provider
  module. Reference: `packages/module-notifications/src/adapters/`.
- **`execution-strategy.ts` from `module-workflows`** — cited in
  `docs/modules/17-auth.md` §3 as the original adapter-pattern
  precedent in this repo.
- **OWASP ASVS 4.0.3 §V2 Authentication** — acceptance tests track
  §2.1 (password security), §2.2 (general authenticator), §2.7 (out
  of band), §2.8 (single or multi-factor OTC), §2.10 (service auth).
- **OWASP Argon2 Cheat Sheet** — baseline parameters
  `m=19456, t=2, p=1` used in `secure.md`.
- **OAuth 2.0 Refresh Token Rotation (RFC draft-ietf-oauth-security-topics)**
  — reuse-detection strategy (§4.14).

## Reference modules in this repo

- `packages/module-notifications/**` — adapter pattern reference.
- `packages/module-config/**` — cascade resolver pattern; `module-auth`
  consumes config for 5 keys and must match the caller contract.
- `packages/module-registry/src/api-utils.ts` — `parseListParams`,
  `listResponse`, `badRequest`, `unauthorized`, `forbidden`,
  `notFound`, `errorResponse`.
- `packages/module-workflows/src/strategies/execution-strategy.ts` —
  original execution-strategy adapter shape.

## Ground-truth rule files consulted

Every file from the pipeline's "ground-truth" list was read before
writing any requirement:

- `docs/module-rules.md`
- `docs/package-composition.md`
- `docs/routes.md`
- `docs/use-cases.md`
- `docs/modules/00-overview.md`
- `docs/modules/20-module-config.md`
- `docs/modules/21-module-subscriptions.md`
- `docs/modules/13-tenants.md`
- `docs/modules/17-auth.md`
- Root `CLAUDE.md`

All requirements in `detailed-requirements.md` trace back to a
specific rule or to one of these references.
