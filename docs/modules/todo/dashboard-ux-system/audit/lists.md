# Dashboard UX Audit -- List Components

> Generated: 2026-04-13 (cycle-30 session)
> Total files audited: 62

## Tenant-scoped lists (18 of 62)

| File | Tenant Filter Shape | Filter Count | Filters | Status Control | Date Filter | Tenant Column (Admin) | style= Violations | Sprint |
|------|---------------------|-------------|---------|---------------|------------|----------------------|-------------------|--------|
| `ai/UsageLogList.tsx` | TextInput (alwaysOn) | 5 | tenantId, providerId, modelId, startDate, endDate | FunctionField | Yes | Yes | 0 | sprint-03 |
| `ai/VectorStoreList.tsx` | (no filter, column only) | 3 | q, adapter, enabled | BooleanField | No | Yes | 0 | sprint-03 |
| `files/FileList.tsx` | NumberInput | 4 | folder, mimeType, sourceModule, tenantId | No | No | Yes | Yes (sx) | sprint-03 |
| `flow-items/FlowItemList.tsx` | NumberInput | 4 | flowId, status, contentType, tenantId | SelectInput | No | Yes | 0 | sprint-03 |
| `flows/FlowList.tsx` | NumberInput | 3 | q, enabled, tenantId | FunctionField | No | Yes | 0 | sprint-03 |
| `form-components/FormComponentList.tsx` | (no filter, column only) | 2 | q, category | FunctionField | No | Yes | 0 | sprint-03 |
| `form-submissions/FormSubmissionList.tsx` | NumberInput | 2 | formId, tenantId | No | No | Yes | 0 | sprint-03 |
| `forms/FormList.tsx` | NumberInput | 3 | q, status, tenantId | SelectInput | No | Yes | 0 | sprint-03 |
| `knowledge-base/CategoryList.tsx` | ReferenceInput | 4 | q, knowledgeBaseId, tenantId, enabled | No | No | Yes | 0 | sprint-03 |
| `knowledge-base/EntryList.tsx` | ReferenceInput | 5 | q, knowledgeBaseId, tenantId, categoryId, language, enabled | No | No | Yes | Yes (sx) | sprint-03 |
| `knowledge-base/KnowledgeBaseList.tsx` | ReferenceInput (alwaysOn) | 3 | q, tenantId, enabled | BooleanField | No | Yes | 0 | sprint-03 |
| `module-configs/ConfigList.tsx` | NumberInput | 4 | moduleName, scope, key, tenantId | No | No | Yes | Yes (sx) | sprint-03 |
| `notifications/ChannelList.tsx` | None (but shows tenant column) | 3 | q, channelType, enabled | BooleanField | No | Yes | 0 | sprint-03 |
| `notifications/ConversationList.tsx` | NumberInput | 3 | tenantId, status, channelType | FunctionField | No | Yes | 0 | sprint-03 |
| `notifications/EscalationList.tsx` | NumberInput | 3 | tenantId, status, reason | FunctionField | No | Yes | Yes (sx) | sprint-03 |
| `tenant-members/TenantMemberList.tsx` | NumberInput (alwaysOn) | 2 | tenantId, role | FunctionField | No | Yes | 0 | sprint-03 |
| `tenant-subscriptions/TenantSubscriptionList.tsx` | NumberInput (alwaysOn) | 2 | tenantId, status | FunctionField | Yes | Yes | 0 | sprint-03 |
| `ui-flow-analytics/UiFlowAnalyticsList.tsx` | NumberInput | 4 | eventType, pageSlug, tenantId, uiFlowId | No | No | No | 0 | sprint-03 |
| `ui-flows/UiFlowList.tsx` | NumberInput | 3 | q, status, tenantId | FunctionField | No | Yes | 0 | sprint-03 |

**Drift**: None use `useTenantContext`. All hand-roll their own tenant
filter via `NumberInput` or `ReferenceInput`. All 18 must migrate to
`useTenantContext` in sprint-03.

## Non-tenant-scoped lists (44 of 62)

| File | Filter Count | Filters | Status Control | Date Filter | style= Violations | Sprint |
|------|-------------|---------|---------------|------------|-------------------|--------|
| `agents/AgentList.tsx` | 2 | q, enabled | BooleanField | No | 0 | -- |
| `agents/ExecutionList.tsx` | 2 | agentId, status | FunctionField | No | 0 | -- |
| `agents/NodeList.tsx` | 1 | category | No | No | 0 | -- |
| `agents/SessionList.tsx` | 2 | agentId, status | No | No | 0 | -- |
| `ai/AliasList.tsx` | 3 | q, type, enabled | BooleanField | No | 0 | -- |
| `ai/BudgetAlertList.tsx` | 2 | budgetId, type | No | No | 0 | -- |
| `ai/BudgetList.tsx` | 2 | scope, enabled | No | No | 0 | -- |
| `ai/GuardrailList.tsx` | 4 | q, ruleType, scope, enabled | No | No | 0 | -- |
| `ai/PlaygroundExecutionList.tsx` | 3 | model, type, status | FunctionField | No | 0 | -- |
| `ai/ProviderList.tsx` | 3 | q, type, enabled | FunctionField | No | 0 | -- |
| `api-permissions/ApiPermissionList.tsx` | 1 | filter (custom) | No | No | Yes (extensive) | sprint-06 |
| `auth/ApiKeyList.tsx` | 1 | q | FunctionField | No | 0 | -- |
| `auth/UserList.tsx` | 2 | q, status | FunctionField | No | 0 | -- |
| `billing-plans/BillingPlanList.tsx` | 1 | q | FunctionField | No | 0 | -- |
| `chat/ChatCommandList.tsx` | 3 | q, category, isBuiltIn | BooleanField | No | 0 | -- |
| `chat/ChatFeedbackList.tsx` | 1 | rating | FunctionField | No | 0 | -- |
| `chat/ChatHookList.tsx` | 3 | q, event, enabled | BooleanField | No | 0 | -- |
| `chat/ChatMCPConnectionList.tsx` | 1 | transport | No | No | 0 | -- |
| `chat/ChatSessionList.tsx` | 4 | q, status, channel, isPinned | FunctionField | No | Yes (sx) | sprint-06 |
| `chat/ChatSkillList.tsx` | 3 | q, source, enabled | BooleanField | No | 0 | -- |
| `flow-reviews/FlowReviewList.tsx` | 3 | flowItemId, reviewerId, decision | FunctionField | No | 0 | -- |
| `hierarchy-nodes/HierarchyList.tsx` | 2 | q, type | No | No | 0 | -- |
| `map-assignments/MapAssignmentList.tsx` | 2 | playerId, mapId | FunctionField | No | Yes (sx) | sprint-06 |
| `maps/MapList.tsx` | 3 | q, mode, status | FunctionField | No | 0 | -- |
| `permissions/PermissionList.tsx` | 2 | q, resource | No | No | 0 | -- |
| `player-positions/PositionList.tsx` | 3 | playerId, sessionId, mapId | No | No | Yes (sx) | sprint-06 |
| `players/PlayerList.tsx` | 2 | q, status | FunctionField | No | 0 | -- |
| `provider-services/ProviderServiceList.tsx` | 2 | providerId, serviceId | FunctionField | No | 0 | -- |
| `providers/ProviderList.tsx` | 1 | q | FunctionField | No | 0 | -- |
| `rls-policies/RlsPolicyList.tsx` | 3 | q, status, targetTable | FunctionField | No | Yes (sx) | sprint-06 |
| `roles/RoleList.tsx` | 2 | q, enabled | BooleanField | No | 0 | -- |
| `service-categories/ServiceCategoryList.tsx` | 1 | q | FunctionField | No | 0 | -- |
| `services/ServiceList.tsx` | 2 | q, categoryId | FunctionField | No | 0 | -- |
| `sessions/SessionList.tsx` | 2 | player_id, map_id | FunctionField | No | Yes (sx) | sprint-06 |
| `tenants/TenantList.tsx` | 2 | q, enabled | FunctionField | No | N/A | -- |
| `tiles/TileList.tsx` | 3 | q, category, tilesetId | No | No | Yes (style=) | sprint-05 |
| `tilesets/TilesetList.tsx` | 1 | q | No | No | Yes (style=) | sprint-05 |
| `workflow-agents/AgentMemoryList.tsx` | 2 | q, key | No | No | Yes (sx) | sprint-06 |
| `workflow-agents/AgentWorkflowExecutionList.tsx` | 1 | status | FunctionField | No | Yes (sx) | sprint-06 |
| `workflow-agents/AgentWorkflowList.tsx` | 2 | q, status | FunctionField | No | Yes (sx) | sprint-06 |
| `workflow-agents/MCPServerList.tsx` | 0 | (none) | No | No | Yes (sx) | sprint-06 |
| `workflows/ExecutionList.tsx` | 2 | workflowId, status | FunctionField | No | Yes (sx) | sprint-06 |
| `workflows/WorkflowList.tsx` | 3 | q, enabled, triggerEvent | BooleanField | No | Yes (sx) | sprint-06 |
| `world-configs/WorldConfigList.tsx` | 1 | q | FunctionField | No | Yes (sx) | sprint-06 |

## Aggregate statistics

- **Total List files**: 62
- **Tenant-scoped**: 18 (29%) -- all hand-roll tenant filter, none use useTenantContext
- **With status control**: 42 (68%)
- **With date filter**: 2 (3%) -- UsageLogList, TenantSubscriptionList
- **With style= violations**: 16 files (14 use sx in FunctionField, 2 use raw `style={}`)
- **Average filter count**: 2.4 filters per list

## Tenant filter shape breakdown

| Shape | Count | Files |
|-------|-------|-------|
| `NumberInput` | 11 | FormList, FormSubmissionList, FlowList, FlowItemList, UiFlowList, UiFlowAnalyticsList, ConversationList, EscalationList, ConfigList, TenantMemberList, TenantSubscriptionList |
| `ReferenceInput` | 3 | CategoryList, EntryList, KnowledgeBaseList |
| `TextInput` | 1 | UsageLogList |
| Column only (no filter) | 3 | VectorStoreList, FormComponentList, ChannelList |

All should migrate to `useTenantContext` + auto-filter pattern (sprint-03).
