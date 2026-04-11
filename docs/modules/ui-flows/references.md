# UI Flows -- References

External resources, prior art, and internal documents that inform the design of `module-ui-flows`. Every URL should resolve without authentication.

## Internal references

| Document                                              | Why                                                       |
|-------------------------------------------------------|-----------------------------------------------------------|
| `docs/modules/19-ui-flows.md`                         | Top-level spec (722 lines) -- authoritative data model.   |
| `docs/apps-portal.md`                                 | Portal app architecture and subdomain handling.           |
| `docs/dental-project.md`                              | Reference customer user stories.                          |
| `docs/dental-project-ui-tasks.md`                     | UI task list the module must cover.                       |
| `docs/modules/13-tenants.md`                          | Tenant isolation and RLS policies.                        |
| `docs/modules/17-auth.md`                             | Authentication boundaries.                                |
| `docs/modules/20-module-config.md`                    | Module config contract used by `configSchema`.            |
| `docs/modules/21-module-subscriptions.md`             | Subscriptions and usage-metering contract.                |
| `docs/modules/knowledge-base/*`                       | Reference shape for the canonical doc folder.             |
| `docs/modules/workflow-agents/api.md`                 | How `chat.actionSchemas` become MCP tools.                |
| `docs/module-rules.md`                                | Plain-int FKs, tenant columns, indexes, versioning.       |
| `docs/package-composition.md`                         | App / package boundary rules for `apps/portal`.           |
| `docs/routes.md`                                      | Canonical route naming.                                   |

## External framework documentation

| Topic                               | URL                                                                 |
|-------------------------------------|---------------------------------------------------------------------|
| Next.js 15 App Router               | https://nextjs.org/docs/app                                         |
| Next.js middleware                  | https://nextjs.org/docs/app/building-your-application/routing/middleware |
| Next.js Incremental Static Regeneration | https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration |
| Vercel multi-tenant guide           | https://vercel.com/guides/nextjs-multi-tenant-application           |
| Vercel custom domains API           | https://vercel.com/docs/rest-api/reference/endpoints/domains         |
| ReactFlow v12 docs                  | https://reactflow.dev/docs                                          |
| ReactFlow node types                | https://reactflow.dev/learn/customization/custom-nodes              |
| MUI 7 `sx` prop                     | https://mui.com/system/getting-started/the-sx-prop/                 |
| Zustand vanilla store API           | https://docs.pmnd.rs/zustand/guides/typescript#using-createstore    |
| Drizzle ORM docs                    | https://orm.drizzle.team/docs/overview                              |
| React Admin 5 datagrid              | https://marmelab.com/react-admin/Datagrid.html                      |
| Tailwind CSS core concepts          | https://tailwindcss.com/docs/utility-first                          |

## Prior art and inspiration

| Topic                               | URL                                                                 |
|-------------------------------------|---------------------------------------------------------------------|
| Webflow's multi-page site model     | https://webflow.com/feature/pages                                   |
| Framer multi-page sites             | https://www.framer.com/learn/                                       |
| Builder.io visual CMS               | https://www.builder.io/c/docs/visual-editor                        |
| Sanity page builder                 | https://www.sanity.io/docs/page-building                            |
| Plasmic page editor                 | https://docs.plasmic.app/learn/intro-to-plasmic                     |

These tools all solve variants of "drag pages into a canvas, publish to a subdomain, inject a theme". The UI flows editor borrows the "one node per page + separate navigation node" pattern from Webflow's page list, the inspector-on-the-right pattern from Plasmic, and the theme-as-a-node metaphor from n8n's workflow-level config nodes.

## Standards and specs

| Topic                               | URL                                                                 |
|-------------------------------------|---------------------------------------------------------------------|
| OWASP Top 10 (2021)                 | https://owasp.org/Top10/                                            |
| OWASP XSS prevention cheat sheet    | https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html |
| WCAG 2.1 AA checklist               | https://www.w3.org/WAI/WCAG21/quickref/                             |
| DNS TXT record verification         | https://datatracker.ietf.org/doc/html/rfc1464                       |
| HTTP rate limiting patterns         | https://datatracker.ietf.org/doc/html/draft-polli-ratelimit-headers |

## Research notes

Open questions gathered during sprint-00 discovery. Each turns into a checklist item for the responsible sprint.

- **Preview iframe security** -- the editor preview loads the live portal in an iframe. Needs `X-Frame-Options` exception for same-origin dev. Handled in `sprint-03-editor-hardening.md`.
- **CSS sanitization library** -- the `ENABLE_CUSTOM_CSS` flow requires a trusted CSS validator. Candidates: `css-tree`, a hand-written allow-list. Decision deferred until `ENABLE_CUSTOM_CSS` is actually requested by a tenant. Default stays `false`.
- **Pageless navigation** -- some tenants may want a single-page portal (just a landing page). `routing.defaultPage` + `HOME_PAGE_SENTINEL` already handle this, but the editor needs a tutorial pointing at the "single page" template. Sprint-03 adds this to the FTUE.
- **SEO meta tags** -- the portal currently doesn't emit `<meta>` tags beyond Next.js defaults. Tenants will ask for per-page Open Graph tags. Add an `seo` field to `UiFlowPage['config']` in a future sprint.
- **A/B testing** -- supporting two `published` rows per tenant requires a traffic splitter in the portal middleware. Out of scope until a tenant requests it.

## Changelog

| Date       | Change                                                                                                     |
|------------|-------------------------------------------------------------------------------------------------------------|
| 2026-04-11 | Canonical doc folder graduated in session `claude/eager-curie-TXjZZ`. Content derived from spec + package source. |
