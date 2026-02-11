# Workflow & Config API Reference

## Workflow Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflows` | List all workflows (pagination, filter by `q`, `enabled`, `triggerEvent`) |
| POST | `/api/workflows` | Create a workflow (auto-generates slug from name) |
| GET | `/api/workflows/:id` | Get workflow by ID |
| PUT | `/api/workflows/:id` | Update workflow (auto-increments version if definition changes) |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow with optional JSON payload |

## Execution Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflow-executions` | List executions (filter by `workflowId`, `status`) |
| GET | `/api/workflow-executions/:id` | Get execution with all node_executions |
| POST | `/api/workflow-executions/:id/cancel` | Cancel a running execution |

## Config Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/module-configs` | List configs (filter by `moduleName`, `scope`, `key`) |
| POST | `/api/module-configs` | Create/upsert a config value |
| GET | `/api/module-configs/:id` | Get config by ID |
| PUT | `/api/module-configs/:id` | Update config |
| DELETE | `/api/module-configs/:id` | Delete config |
| GET | `/api/module-configs/resolve` | Resolve effective config value |

### Config Resolution

```
GET /api/module-configs/resolve?moduleName=maps&key=chunkSize&scopeId=5
```

Resolution order:
1. Instance override (`scope=instance`, `scopeId=5`)
2. Module default (`scope=module`)
3. Not found → `{ value: null, source: "default" }`

## Node Types Endpoint

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/node-types` | List all available workflow node types |
| GET | `/api/node-types?module=maps` | Filter by module |
| GET | `/api/node-types?grouped=true` | Grouped by module (for palette) |

## Events Emitted

- `workflows.workflow.created` — `{ id, name, slug }`
- `workflows.workflow.updated` — `{ id, name, version }`
- `workflows.workflow.deleted` — `{ id, name }`
- `workflows.execution.started` — `{ executionId, workflowId, workflowName }`
- `workflows.execution.completed` — `{ executionId, context }`
- `workflows.execution.failed` — `{ executionId, error }`
- `workflows.node.started` — `{ executionId, nodeId, nodeType }`
- `workflows.node.completed` — `{ executionId, nodeId, output, durationMs }`
- `workflows.node.failed` — `{ executionId, nodeId, error }`
