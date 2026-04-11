# Module Auth — Dashboard UI

All dashboard UI lives under `apps/dashboard/src/components/auth/**`
and follows the MUI `sx` prop rule from `CLAUDE.md`. **No `style={{ }}`
props anywhere in this module's UI.** All `import type` for
type-only imports.

## Pages

### `/login` (public, outside `<Admin>`)

File: `apps/dashboard/src/components/auth/LoginPage.tsx`

- Email + password form (MUI `<TextField>`).
- "Forgot password?" link → `/forgot-password`.
- Submit → `POST /api/auth/login` → write access + refresh tokens to
  the next-auth cookie → `router.replace('/')`.
- Error states rendered from the `AUTH_*` code set in
  `architecture.md` §4 — never from parsed message strings.

### `/register` (public)

File: `apps/dashboard/src/components/auth/RegisterPage.tsx`

- Shown only if `GET /api/module-configs/resolve?moduleName=auth&key=ALLOW_SELF_REGISTRATION`
  returns `true`. Otherwise the route responds with a 404 from the
  custom-route table.
- Email + name + password + password-confirm. `PASSWORD_MIN_LENGTH`
  resolved from the same endpoint.

### `/forgot-password` (public) and `/reset-password` (public)

Thin forms that call the public endpoints of the same name. The
reset page reads `?token=...` from the query string.

### `/profile` (authenticated)

File: `apps/dashboard/src/components/auth/ProfilePage.tsx`

- Tabs: **Details**, **Change password**, **Sessions**, **API keys**.
- Details tab: read-only email, editable name/avatar. Save calls
  `PUT /api/auth/me`.
- Change password: old + new + confirm. Calls
  `POST /api/auth/change-password` (adapter-delegated).
- Sessions tab: table of `GET /api/auth/sessions` with a revoke button
  per row.
- API keys tab: embeds `ApiKeyList` + `ApiKeyCreate` as dialogs.

## React Admin resources

### `API Keys`

Mounted via `authModule.resources[0]`.

- `ApiKeyList.tsx` — Datagrid:
  - columns: `name`, `keyPrefix` (masked `oven_1a2b3c4d••••`),
    `tenantId` (resolved to tenant name), `lastUsedAt`, `expiresAt`,
    `enabled` (BooleanField).
  - Filter toolbar: tenant, enabled, created-since.
- `ApiKeyCreate.tsx` — SimpleForm:
  - `name` (TextInput, required).
  - `tenantId` (ReferenceInput → tenants, optional).
  - `permissions` (ArrayInput → SelectInput per row; list loaded from
    `GET /api/roles/permissions`).
  - `expiresAt` (DateTimeInput, optional).
  - On create, the response body carries `plaintext`. A **modal
    dialog** shows the plaintext with a copy button and a mandatory
    "I have stored this key securely" checkbox. Closing the dialog
    without the checkbox ticked is disabled.
- `ApiKeyShow.tsx` — read-only row view. The plaintext is **never**
  shown outside the create flow.

### `Users`

Not a first-class resource in the MVP — deferred to a sprint-04
follow-up. The MVP ships `GET /api/auth/me` + profile page only,
because tenant-scoped user listing needs `module-tenants`' membership
resolver to be firm first.

## Menu

```
──── Access Control ────
  API Keys         (resources)
  Profile          (via avatar menu in the AppBar)
```

`Users` appears in this section once sprint-04 ships.

## Styling rules observed

- All components use the MUI `sx` prop. No inline `style={}`.
- No hand-written CSS classes; no `styled()` wrappers.
- All form layouts use theme spacing (`sx={{ p: 2, gap: 1 }}`), no
  raw pixel values.
- Responsive breakpoints use `sx={{ p: { xs: 1, md: 2 } }}` where
  needed.
- Every component accepts and forwards a `className` / `sx` where
  it wraps a reusable primitive, for composability.
