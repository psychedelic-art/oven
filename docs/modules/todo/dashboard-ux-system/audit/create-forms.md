# Dashboard UX Audit -- Create Forms

> Generated: 2026-04-13 (cycle-30 session)
> Total files audited: 45

## Tenant-aware create forms (16 of 45)

| File | Auto-assigns tenantId? | Tenant picker exposed | Picker shape | Sprint |
|------|----------------------|----------------------|-------------|--------|
| `ai/GuardrailCreate.tsx` | No | Yes | NumberInput (optional) | sprint-03 |
| `ai/VectorStoreCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `auth/ApiKeyCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `auth/UserCreate.tsx` | No | Yes | NumberInput (defaultTenantId) | sprint-03 |
| `flow-items/FlowItemCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `flows/FlowCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `form-components/FormComponentCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `forms/FormCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `knowledge-base/CategoryCreate.tsx` | No | Yes | ReferenceInput | sprint-03 |
| `knowledge-base/EntryCreate.tsx` | No | Yes | ReferenceInput | sprint-03 |
| `knowledge-base/KnowledgeBaseCreate.tsx` | No | Yes | ReferenceInput | sprint-03 |
| `module-configs/ConfigCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `notifications/ChannelCreate.tsx` | No | Yes | TextInput | sprint-03 |
| `tenant-members/TenantMemberCreate.tsx` | No | Yes | ReferenceInput | sprint-03 |
| `tenant-subscriptions/TenantSubscriptionCreate.tsx` | No | Yes | NumberInput | sprint-03 |
| `ui-flows/UiFlowCreate.tsx` | No | Yes | NumberInput | sprint-03 |

**DRIFT**: Zero create forms use `transform` to auto-assign `tenantId`.
All 16 expose a manual tenant picker to all users. Per Rule 6.4, these
must migrate to `useTenantContext` + `transform` pattern in sprint-03.

## Non-tenant create forms (29 of 45)

| File | Notes |
|------|-------|
| `agents/AgentCreate.tsx` | System-level entity |
| `agents/NodeCreate.tsx` | System-level entity |
| `ai/AliasCreate.tsx` | System-level entity |
| `ai/BudgetCreate.tsx` | Scope-based, no tenant field |
| `ai/ProviderCreate.tsx` | System-level entity |
| `billing-plans/BillingPlanCreate.tsx` | System-level entity |
| `chat/ChatCommandCreate.tsx` | System-level entity |
| `chat/ChatHookCreate.tsx` | System-level entity |
| `chat/ChatMCPConnectionCreate.tsx` | System-level entity |
| `chat/ChatSkillCreate.tsx` | System-level entity |
| `hierarchy-nodes/HierarchyCreate.tsx` | System-level entity |
| `map-assignments/MapAssignmentCreate.tsx` | System-level entity |
| `maps/MapCreate.tsx` | System-level entity |
| `permissions/PermissionCreate.tsx` | System-level entity |
| `plan-quotas/PlanQuotaCreate.tsx` | System-level entity |
| `players/PlayerCreate.tsx` | System-level entity |
| `providers/ProviderCreate.tsx` | System-level entity |
| `provider-services/ProviderServiceCreate.tsx` | System-level entity |
| `quota-overrides/QuotaOverrideCreate.tsx` | System-level entity |
| `rls-policies/RlsPolicyCreate.tsx` | System-level entity |
| `roles/RoleCreate.tsx` | System-level entity |
| `service-categories/ServiceCategoryCreate.tsx` | System-level entity |
| `services/ServiceCreate.tsx` | System-level entity |
| `sessions/SessionCreate.tsx` | System-level entity |
| `tenants/TenantCreate.tsx` | Tenant is the entity itself |
| `tiles/TileCreate.tsx` | System-level entity |
| `tilesets/TilesetCreate.tsx` | System-level entity |
| `workflow-agents/AgentWorkflowCreate.tsx` | System-level entity |
| `workflows/WorkflowCreate.tsx` | System-level entity |
| `world-configs/WorldConfigCreate.tsx` | System-level entity |

## Edit form tenant visibility (tenant-scoped only)

| File | Tenant visible? | Editable? | Sprint |
|------|----------------|-----------|--------|
| `forms/FormEdit.tsx` | NumberInput | Editable | sprint-03 |
| `ai/VectorStoreEdit.tsx` | NumberInput | Editable | sprint-03 |
| `flows/FlowEdit.tsx` | NumberInput | Editable | sprint-03 |
| `form-components/FormComponentEdit.tsx` | NumberInput | Editable | sprint-03 |
| `module-configs/ConfigEdit.tsx` | NumberInput | Editable | sprint-03 |
| `ui-flows/UiFlowEdit.tsx` | NumberInput | Editable | sprint-03 |
| `notifications/ChannelEdit.tsx` | TextInput | Editable | sprint-03 |
| `auth/UserEdit.tsx` | NumberInput (defaultTenantId) | Editable | sprint-03 |

**DRIFT**: All tenant-scoped edit forms expose tenant as editable,
not read-only. Per Rule 6.4, after `useTenantContext` migration
these should be either hidden or read-only.

## Custom editor links from Edit pages

| File | Editor link | Pattern |
|------|------------|---------|
| `forms/FormEdit.tsx` | "Open Editor" button | Toolbar button |
| `workflows/WorkflowEdit.tsx` | "Visual Editor" button | Toolbar button |
| `workflow-agents/AgentWorkflowEdit.tsx` | "Visual Editor" + "Clone" buttons | Toolbar button |

These three follow Rule 6.5 correctly.

## style= violations in Create/Edit files

| File | Type | Notes |
|------|------|-------|
| `tiles/TileEdit.tsx` | `style={}` | L96: raw style on input (sprint-05) |
| `tilesets/TilesetEdit.tsx` | `style={}` | L223, 347, 357, 413, 421, 490: raw styles on inputs (sprint-05) |

All other files use MUI `sx` correctly (no `style={}`).

## Aggregate statistics

- **Create forms with tenant field**: 16 (36%)
- **Create forms using transform auto-assign**: 0 (0%)
- **Edit forms with editable tenant**: 8
- **Edit forms with toolbar editor link**: 3
- **style= violations**: 2 files (tiles, tilesets)
