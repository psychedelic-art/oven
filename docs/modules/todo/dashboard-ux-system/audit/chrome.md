# Dashboard UX Audit -- Chrome Components

> Generated: 2026-04-13 (cycle-30 session)

## Chrome primitive inventory

| Primitive | Exists in `@oven/dashboard-ui`? | Used in dashboard? | Where needed | Sprint |
|-----------|-------------------------------|-------------------|-------------|--------|
| `PageHeader` | Stub (throws) | No | Every resource page | sprint-06 |
| `EmptyState` | Stub (throws) | No | List pages with zero records | sprint-06 |
| `LoadingSkeleton` | Stub (throws) | No | Heavy-fetch pages (playground, analytics) | sprint-06 |
| `ErrorBoundary` | Stub (throws) | No | Page-level wrappers (AIPlayground has its own `PlaygroundErrorBoundary`) | sprint-06 |
| `MenuSectionLabel` | Stub (throws) | No | `CustomMenu.tsx` (18 sections) | sprint-06 |
| `TenantContextProvider` | Live | No | `AdminApp.tsx` must wrap routes | sprint-03 |
| `TenantSelector` | Live | No | React Admin AppBar slot | sprint-03 |

## AdminApp.tsx

- **TenantContextProvider wrapping**: NOT done. `AdminApp` returns
  `<Admin dataProvider={dataProvider} layout={CustomLayout} loginPage={LoginPage}>` directly.
  Sprint-03 must wrap this in `<TenantContextProvider>`.
- **Chrome components used**: None.

## CustomMenu.tsx -- Section label locations

CustomMenu manually implements 18 menu sections using the pattern:

```tsx
<Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
  <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
    Section Name
  </Typography>
</Box>
```

When `MenuSectionLabel` ships (sprint-06), refactor to:
```tsx
<MenuSectionLabel label="Section Name" />
```

| Section | Menu items | Sprint |
|---------|-----------|--------|
| World | world-configs, maps, map-assignments | sprint-06 |
| Players | players, player-positions, sessions | sprint-06 |
| Automation | flows, flow-items, flow-reviews | sprint-06 |
| AI Services | ai-providers, ai-aliases, ai-guardrails, ai-budgets, ai-budget-alerts, ai-usage-logs, ai-playground-executions, ai-vector-stores | sprint-06 |
| Knowledge Base | knowledge-bases, kb-categories, kb-entries | sprint-06 |
| Agents | agents, agent-nodes, agent-executions, agent-sessions | sprint-06 |
| Chat | chat-sessions, chat-commands, chat-skills, chat-hooks, chat-mcp-connections, chat-feedback | sprint-06 |
| Workflow Agents | agent-workflows, agent-workflow-executions, mcp-servers, agent-memory | sprint-06 |
| Notifications | notification-channels, notification-conversations, notification-escalations | sprint-06 |
| Files | files | sprint-06 |
| Tenants | tenants, tenant-members, tenant-subscriptions | sprint-06 |
| Service Catalog | providers, services, service-categories, provider-services | sprint-06 |
| Flows | tiles, tilesets, hierarchy-nodes | sprint-06 |
| Forms | forms, form-components, form-submissions | sprint-06 |
| Portals | ui-flows, ui-flow-analytics | sprint-06 |
| Access Control | roles, permissions, api-permissions, rls-policies | sprint-06 |
| Platform | billing-plans, plan-quotas, quota-overrides, workflows, workflow-executions, module-configs | sprint-06 |
| System | auth (users, api-keys) | sprint-06 |

## app/layout.tsx

- 20 lines. Sets metadata, renders `<html>` + `<body>` + `{children}`.
- No chrome components, no `TenantContextProvider`.

## shared/ directory

Only contains `rich-text-editor/` with 4 files (RichTextEditor,
EditorToolbar, VariableModal, VariablePalette). No chrome primitives.

## style= violations in chrome files

- **AdminApp.tsx**: 0
- **CustomMenu.tsx**: 0 (uses sx correctly)
- **app/layout.tsx**: 0
