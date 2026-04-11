# UI Flows -- Database

Four tables, all defined in `packages/module-ui-flows/src/schema.ts`. All follow `docs/module-rules.md`: plain integer FKs (Rule 4.3), `tenant_id` columns for tenant-scoped rows (Rule 5.1), explicit indexes (Rule 6.1), and standard `created_at`/`updated_at` timestamps (Rule 11.2).

---

## `ui_flows` -- portal definition rows

Primary source of truth for each tenant's portal. A tenant may have multiple rows if A/B testing or multiple environments (draft + published) are desired.

| Column       | Type                     | Notes |
|--------------|--------------------------|-------|
| `id`         | `serial primary key`     |       |
| `tenant_id`  | `integer not null`       | References `tenants.id` (plain integer per Rule 4.3, no Drizzle `.references()`). |
| `name`       | `varchar(255) not null`  | Human-readable portal name. |
| `slug`       | `varchar(128) not null unique` | URL-safe slug, unique across all tenants. |
| `description`| `text`                   | Optional marketing description. |
| `definition` | `jsonb not null`         | The `UiFlowDefinition` JSON: pages, navigation, routing, footer. |
| `theme_config` | `jsonb`                | `ThemeConfig`: colors, fonts, logo URL, custom CSS. |
| `domain_config` | `jsonb`               | `DomainConfig`: subdomain, custom domain, SSL status. |
| `status`     | `varchar(20) not null default 'draft'` | `draft` / `published` / `archived`. |
| `version`    | `integer not null default 1` | Incremented on each publish. |
| `enabled`    | `boolean not null default true` | Soft disable without archiving. |
| `created_at` | `timestamp not null default now()` | |
| `updated_at` | `timestamp not null default now()` | |

**Indexes:**
- `ui_flows_tenant_id_idx` on `(tenant_id)`
- `ui_flows_slug_idx` on `(slug)`
- `ui_flows_status_idx` on `(status)`

**RLS considerations:** The `tenant_id` column is the primary isolation key. All handlers filter by `tenant_id` from the `x-tenant-id` header. Row-level security policies live at the database layer and mirror `docs/modules/13-tenants.md`.

---

## `ui_flow_versions` -- immutable snapshots

Captured on every publish. Used by the version history modal and the "Restore" flow.

| Column       | Type                     | Notes |
|--------------|--------------------------|-------|
| `id`         | `serial primary key`     |       |
| `ui_flow_id` | `integer not null`       | References `ui_flows.id`. |
| `version`    | `integer not null`       | Monotonic within a flow. |
| `definition` | `jsonb not null`         | Snapshot of `ui_flows.definition` at publish time. |
| `theme_config` | `jsonb`                | Snapshot of `ui_flows.theme_config`. |
| `description`| `text`                   | Optional publish note. |
| `created_at` | `timestamp not null default now()` | |

**Indexes:**
- `ui_fv_flow_id_idx` on `(ui_flow_id)`
- `ui_fv_unique` unique on `(ui_flow_id, version)`

Rule 7.2 (version tables) compliance: `ui_flow_versions` is the canonical version table for `ui_flows`. The restore handler does not mutate rows in place; it inserts a new row in `ui_flow_versions` *after* copying the snapshot back into `ui_flows` and bumping the version.

---

## `ui_flow_pages` -- denormalized page index

A read-model of the `definition.pages[]` JSONB array. Rebuilt on every save. Used by the dashboard's inline page datagrid, by the public page resolver (to short-circuit parsing the JSONB), and by analytics joins to resolve `pageSlug` back to a `pageType`.

| Column        | Type                     | Notes |
|---------------|--------------------------|-------|
| `id`          | `serial primary key`     |       |
| `ui_flow_id`  | `integer not null`       | References `ui_flows.id`. |
| `tenant_id`   | `integer not null`       | Denormalized for RLS + analytics joins. |
| `slug`        | `varchar(128) not null`  | Page slug within the flow. |
| `title`       | `varchar(255) not null`  | Display title. |
| `page_type`   | `varchar(50) not null`   | `form` / `faq` / `landing` / `chat` / `custom`. |
| `form_id`     | `integer`                | Optional FK to `forms.id` for `form`/`custom` types. |
| `config`      | `jsonb`                  | Page-specific config object. |
| `position`    | `integer not null default 0` | Ordering within the flow navigation. |
| `enabled`     | `boolean not null default true` | |
| `created_at`  | `timestamp not null default now()` | |
| `updated_at`  | `timestamp not null default now()` | |

**Indexes:**
- `ui_fp_flow_id_idx` on `(ui_flow_id)`
- `ui_fp_tenant_id_idx` on `(tenant_id)`
- `ui_fp_slug_idx` on `(slug)`
- `ui_fp_flow_page` unique on `(ui_flow_id, slug)`

The rebuild strategy is: `DELETE FROM ui_flow_pages WHERE ui_flow_id = ?` then `INSERT` one row per `definition.pages[]` entry inside a transaction. This is simple and correct; if write volume ever justifies it, switch to a diff-based update in the handler.

---

## `ui_flow_analytics` -- event stream

Every portal interaction lands here. Written by the public `portal-analytics.handler`.

| Column       | Type                     | Notes |
|--------------|--------------------------|-------|
| `id`         | `serial primary key`     |       |
| `ui_flow_id` | `integer not null`       | References `ui_flows.id`. |
| `tenant_id`  | `integer not null`       | Denormalized for RLS + time-range queries. |
| `page_slug`  | `varchar(128) not null`  | Page slug within the flow. |
| `event_type` | `varchar(50) not null`   | `page_view` / `form_submit` / `chat_start` / `cta_click`. |
| `visitor_id` | `varchar(255)`           | Anonymous visitor cookie identifier. |
| `metadata`   | `jsonb`                  | Optional: user agent, referrer, duration, UTM params. |
| `created_at` | `timestamp not null default now()` | |

**Indexes:**
- `ui_fa_flow_id_idx` on `(ui_flow_id)`
- `ui_fa_tenant_id_idx` on `(tenant_id)`
- `ui_fa_created_at_idx` on `(created_at)`

**Retention:** Controlled by `ANALYTICS_RETENTION_DAYS` from `configSchema` (default 90). A future cron job (see `sprint-03-editor-hardening.md`) will prune rows older than the configured value on a per-tenant basis.

---

## Foreign key matrix

| Source column                   | Target table  | Target column | Nullable | Rule 4.3 compliant |
|---------------------------------|---------------|---------------|:--------:|:------------------:|
| `ui_flows.tenant_id`            | `tenants`     | `id`          | no       | yes                |
| `ui_flow_versions.ui_flow_id`   | `ui_flows`    | `id`          | no       | yes                |
| `ui_flow_pages.ui_flow_id`      | `ui_flows`    | `id`          | no       | yes                |
| `ui_flow_pages.tenant_id`       | `tenants`     | `id`          | no       | yes                |
| `ui_flow_pages.form_id`         | `forms`       | `id`          | yes      | yes                |
| `ui_flow_analytics.ui_flow_id`  | `ui_flows`    | `id`          | no       | yes                |
| `ui_flow_analytics.tenant_id`   | `tenants`     | `id`          | no       | yes                |

No `references()` calls in Drizzle -- FK integrity is enforced at the handler and seed layers, matching the rest of the codebase.

---

## Migration notes

- `ui_flows.slug` is global unique because custom domains resolve across all tenants. If a future requirement scopes slug uniqueness per tenant, drop the global unique and add `unique(tenant_id, slug)`.
- `ui_flow_analytics` is append-only and a prime candidate for partitioning by `(tenant_id, created_at month)` once a tenant's event volume exceeds ~10M/month. Not required at audit time.
- `theme_config` and `domain_config` are intentionally JSONB (not normalized) because their shape iterates quickly as the editor adds new theme properties.

---

## Seed data

See `packages/module-ui-flows/src/seed.ts` and `docs/modules/ui-flows/module-design.md`. Seed inserts:

1. Six `permissions` rows (`ui-flows.read/create/update/delete/publish` + `ui-flow-analytics.read`).
2. Four `api_endpoint_permissions` rows marking the public portal routes.

No default `ui_flows` rows are seeded globally. Dental project seeds (clinica-xyz portal) live in the tenant-specific seed in `apps/dashboard/src/lib/seed/dental-seed.ts`.
