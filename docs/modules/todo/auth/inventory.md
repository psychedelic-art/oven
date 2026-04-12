# Auth Primitive Inventory

> Frozen at dev HEAD `a65a4dc` (2026-04-12, post cycle-15).
> Re-run Scope greps against this SHA before sprint-04 cut-over.

## Methodology

Searched `apps/**` and `packages/**` (excluding `node_modules`) for:
1. `from 'next-auth'` / `from 'next-auth/jwt'`
2. `from 'jsonwebtoken'`
3. `from 'argon2'` / `from 'bcrypt'` / `from 'hash-wasm'`
4. `X-API-Key` / `X-Session-Token` / `X-Tenant-Id` / `Authorization` in `.ts` files
5. `decode(` / `encode(` / `sign(` / `verify(` / `hash(` in auth-related packages

## Inventory

| ID | File:Line | Import / Header | Classification | Target Sprint | Notes |
|----|-----------|-----------------|----------------|---------------|-------|
| AUTH-INV-01 | `packages/auth-authjs/src/index.ts:2` | `import { encode, decode } from 'next-auth/jwt'` | lib | sprint-02 | Adapter package -- owns JWT encode/decode for AuthJS strategy. This is the adapter layer (Rule 3.3); no migration needed unless the adapter interface changes. |
| AUTH-INV-02 | `packages/auth-authjs/src/index.ts:3` | `import { argon2id, argon2Verify } from 'hash-wasm'` | lib | sprint-02 | API-key hashing inside AuthJS adapter. |
| AUTH-INV-03 | `packages/auth-authjs/src/index.ts:18` | `decode({ token, secret, salt })` call | lib | sprint-02 | JWT decoding in `verifySession` method. |
| AUTH-INV-04 | `packages/auth-authjs/src/index.ts:35` | `encode({ token, secret, salt, maxAge })` call | lib | sprint-02 | Access token generation in `createTokens` method. |
| AUTH-INV-05 | `packages/auth-authjs/src/index.ts:49` | `encode({ token, secret, salt, maxAge })` call | lib | sprint-02 | Refresh token generation in `createTokens` method. |
| AUTH-INV-06 | `packages/auth-firebase/src/index.ts:6` | `import { argon2Verify } from 'hash-wasm'` | lib | sprint-02 | API-key verification in Firebase auth adapter. |
| AUTH-INV-07 | `packages/auth-firebase/src/index.ts:100` | `argon2Verify({ password, hash })` call | lib | sprint-02 | API-key check in `verifyApiKey` method. |
| AUTH-INV-08 | `packages/module-auth/src/api/auth-logout.handler.ts:16` | `request.headers.get('Authorization')` | call-site | sprint-04 | Logout handler reads Bearer token to invalidate. Will migrate to `getAuthContext(request)`. |
| AUTH-INV-09 | `packages/module-auth/src/api/auth-me.handler.ts:9` | `request.headers.get('Authorization')` | call-site | sprint-04 | Current-user handler reads Bearer token. Will migrate to `getAuthContext(request)`. |
| AUTH-INV-10 | `packages/module-auth/src/middleware/auth-middleware.ts:49` | `request.headers.get('X-API-Key')` | lib | sprint-01 | Centralized middleware -- this IS the `getAuthContext` target. Sprint-01 hardens it. |
| AUTH-INV-11 | `packages/module-auth/src/middleware/auth-middleware.ts:87` | `request.headers.get('X-Session-Token')` | lib | sprint-01 | Session-token strategy in centralized middleware. |
| AUTH-INV-12 | `packages/module-auth/src/middleware/auth-middleware.ts:122` | `request.headers.get('Authorization')` | lib | sprint-01 | Bearer-token strategy in centralized middleware. |
| AUTH-INV-13 | `packages/agent-ui/src/hooks/useAnonymousSession.ts:71` | `{ 'X-Session-Token': sessionToken }` | call-site | sprint-04 | Client-side anonymous session header injection. Stays as-is; module-auth middleware handles verification. |
| AUTH-INV-14 | `packages/notifications-meta/src/send.ts:34` | `Authorization: \`Bearer \${accessToken}\`` | call-site | N/A | Outbound API call to Meta Graph API. NOT an auth primitive -- this is an external service credential. No migration needed. |
| AUTH-INV-15 | `packages/module-ai/src/tools/generate-image.ts:101` | `'Authorization': \`Bearer \${apiKey}\`` | call-site | N/A | Outbound API call to image generation provider. NOT an auth primitive -- external service credential. No migration needed. |
| AUTH-INV-16 | `packages/notifications-meta/src/__tests__/send.test.ts:39` | `expect(options.headers.Authorization)` | test-only | N/A | Test assertion for outbound Meta API call. No migration needed. |

## Summary

| Classification | Count | Action |
|----------------|-------|--------|
| lib (adapter packages) | 7 (INV-01..07) | Owned by adapter packages. Sprint-02 (AuthJS adapter hardening) may refactor but these are already in the correct adapter layer per Rule 3.3. |
| lib (centralized middleware) | 3 (INV-10..12) | These ARE the auth middleware. Sprint-01 foundation hardens them. |
| call-site (will migrate) | 3 (INV-08, 09, 13) | Sprint-04 acceptance migrates these to `getAuthContext(request)`. |
| call-site (external, no migration) | 2 (INV-14, 15) | Outbound HTTP calls to external APIs. Not auth primitives. |
| test-only | 1 (INV-16) | Keep as-is. |

## Zero Hits

The following greps returned zero results (confirming no stray imports):
- `from 'jsonwebtoken'` -- no direct JWT library usage outside adapters
- `from 'bcrypt'` -- not used anywhere
- `from 'argon2'` (direct) -- only used via `hash-wasm`
- `X-API-Key` / `X-Session-Token` / `Authorization` in `apps/` -- no dashboard app code reads auth headers directly (all delegated to middleware)
