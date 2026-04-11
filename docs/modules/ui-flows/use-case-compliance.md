# UI Flows -- Use Case Compliance

This document maps `module-ui-flows` against the canonical platform use cases in `docs/use-cases.md` and the dental project user stories in `docs/dental-project.md`, `docs/dental-project-ui-tasks.md`, and `docs/dandia-onboarding-checklist.md`.

## 1. Platform use cases (`docs/use-cases.md`)

The UI flows module primarily extends use cases 2 (onboard tenant) and 3 (configure tenant), with a light touch on 4 (run tenant), 10 (customer-facing portal), and 12 (analytics).

| Use case | Name                                   | Relevance  | Coverage |
|:--------:|----------------------------------------|------------|----------|
| 1        | Platform setup                         | indirect   | `configSchema.DEFAULT_THEME` + `ENABLE_CUSTOM_DOMAINS` set here. |
| 2        | Onboard tenant                         | primary    | Creating a UI flow and publishing it is part of the onboarding checklist. |
| 3        | Configure tenant                       | primary    | The tenant's portal is a first-class configurable surface. |
| 4        | Run tenant day-to-day                  | supports   | Tenants update pages, swap themes, review analytics without engineering. |
| 10       | Customer-facing portal                 | primary    | `apps/portal` is the canonical implementation of this use case. |
| 12       | Analytics review                       | supports   | `ui_flow_analytics` + dashboard analytics list satisfy the "per-tenant usage review" workflow. |

### Use case 2: Onboard tenant

**Given** a platform admin has created a new tenant row and assigned an owner.
**When** the tenant owner completes onboarding.
**Then** a default UI flow must exist for the tenant with a published `landing`, `faq`, and `chat` page.

*Coverage*: Onboarding seeds a draft UI flow via `dental-seed.ts` (or a generic seed). The tenant owner is directed to `/ui-flows/[id]/editor` and completes the publish step. Seed responsibility lives outside this module; see `docs/modules/13-tenants.md`.

### Use case 3: Configure tenant

**Given** a configured tenant.
**When** the owner wants to rebrand the portal or change the home page.
**Then** they can open the visual editor, drag pages, change the theme, and republish without engineering involvement.

*Coverage*: the editor + dashboard CRUD satisfy this fully once sprint-03 lands the validation hardening.

### Use case 4: Run tenant day-to-day

**Given** a published portal.
**When** patients visit and submit forms.
**Then** submissions are stored in `module-forms`, analytics are captured in `ui_flow_analytics`, and downstream modules (notifications, workflows) can react.

*Coverage*: `portal-analytics.handler` emits `ui-flows.page.visited` and `ui-flows.form.submitted`. A future notification workflow listens for `ui-flows.form.submitted` to send a WhatsApp confirmation.

### Use case 10: Customer-facing portal

**Given** a tenant with a published UI flow.
**When** a customer visits the subdomain.
**Then** the portal renders the correct pages, theme, and navigation without the customer needing credentials.

*Coverage*: public portal handlers + `apps/portal` Next.js app (sprint-02).

### Use case 12: Analytics review

**Given** an admin with `ui-flow-analytics.read`.
**When** they open the analytics list.
**Then** they see event counts, filters by date and event type, and can drill into specific pages.

*Coverage*: `UiFlowAnalyticsList.tsx` + `ui-flow-analytics.handler`. Summary cards + filterable datagrid.

## 2. Dental project user stories (`docs/dental-project.md`)

### Story D1: Clinic homepage

> As a clinic patient, I want a clean homepage on my clinic's subdomain so I can find appointments, FAQs, and chat quickly.

**Covered by**: `landing` page renderer + top-bar navigation + `ENABLE_CUSTOM_DOMAINS`.

### Story D2: Appointment form

> As a clinic patient, I want to fill a form to request an appointment without creating an account.

**Covered by**: `form` page type backed by a `module-forms` appointment form. Portal submits via existing forms API. `ui-flows.form.submitted` event triggers the notification workflow.

### Story D3: FAQ search

> As a clinic patient, I want to search the clinic's FAQ before asking a human.

**Covered by**: `faq` page type backed by `module-knowledge-base`. `FaqRenderer` fetches entries in Spanish and shows them as a searchable accordion.

### Story D4: Dental chat agent

> As a clinic patient, I want to chat with a bot that knows about the clinic's services.

**Covered by**: `chat` page type embeds `@oven/agent-ui` configured with `dental-faq-agent`. Agent behavior is defined in `module-agent-core` and `module-workflow-agents`.

### Story D5: Clinic brand

> As a clinic owner, I want to use my colors, logo, and fonts without asking a developer.

**Covered by**: `ThemePanel` in the editor + `themeConfig` JSONB + CSS custom property injection in the portal layout.

### Story D6: Custom domain

> As a clinic owner, I want patients to reach the portal at `www.mydentalclinic.com`, not a subdomain.

**Covered by**: `domainConfig.customDomain` + verification job + `ENABLE_CUSTOM_DOMAINS`. Full implementation in a future sprint (not sprint-02).

### Story D7: Analytics for the clinic

> As a clinic owner, I want to know how many people visited and filled forms this week.

**Covered by**: `UiFlowAnalyticsList` summary cards filtered to a 7-day range plus the datagrid for drill-down.

## 3. Compliance matrix (module-rules)

| Rule | Name                              | Coverage                                                 |
|------|-----------------------------------|----------------------------------------------------------|
| 1    | ModuleDefinition export           | `uiFlowsModule` exported from `index.ts`.                |
| 2.1  | Dependency declaration            | `dependencies: ['forms', 'tenants']`.                    |
| 2.2  | Events emitted listed             | 6 events in `events.emits`.                              |
| 2.3  | Event schemas typed               | `eventSchemas` object with required flags.               |
| 3.1  | Config schema                     | 5 keys with types, defaults, scopes.                     |
| 4.1  | Event name format                 | `ui-flows.{entity}.{action}`.                            |
| 4.3  | Plain int FKs                     | All 4 tables use plain integers.                         |
| 5.1  | `tenant_id` columns               | `ui_flows`, `ui_flow_pages`, `ui_flow_analytics`.        |
| 5.2  | Tenant filter on list             | `GET /api/ui-flows` filters by `x-tenant-id`.            |
| 6.1  | Explicit indexes                  | Every table declares its index set.                      |
| 7.2  | Version tables                    | `ui_flow_versions` table + restore flow.                 |
| 8.1  | Seeds idempotent                  | `seedUiFlows` uses `onConflictDoNothing`.                |
| 9.1  | Public endpoints declared         | 4 rows in `api_endpoint_permissions` seed.               |
| 10.1 | List response helper              | Uses `listResponse` from `@oven/module-registry/api-utils`. |
| 11.2 | Standard columns                  | `createdAt`, `updatedAt` on mutable tables.              |

## 4. dental-project-ui-tasks crosscheck

This section cross-references `docs/dental-project-ui-tasks.md` and `docs/dental-project-ui-tasks-crosscheck.md` (once the latter is written -- currently a MEDIUM gap per `docs/modules/crosscheck-report.md`). Task IDs that this module owns:

| Task ID | Description                                                  | Status        |
|---------|--------------------------------------------------------------|---------------|
| UI-01   | Tenant portal list screen                                    | implemented   |
| UI-02   | Tenant portal create flow                                    | implemented   |
| UI-03   | Visual editor: page palette + canvas                         | implemented   |
| UI-04   | Visual editor: theme panel                                   | implemented   |
| UI-05   | Visual editor: validation + publish guardrails               | sprint-03     |
| UI-06   | Portal analytics summary cards                               | implemented   |
| UI-07   | Portal app subdomain routing                                 | sprint-02     |
| UI-08   | Custom domain registration                                   | future sprint |
| UI-09   | FAQ renderer                                                 | sprint-02     |
| UI-10   | Chat renderer                                                | sprint-02     |

Each task is listed here so that `sprint-99-acceptance.md` can verify every row.
