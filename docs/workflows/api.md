# Workflow & Config API Reference

> Last Updated: 2026-02-11

## Workflow Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow (includes definition JSON) |
| PUT | `/api/workflows/:id` | Update workflow (auto-increments version, creates version snapshot) |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow |
| POST | `/api/workflows/:id/compile` | Compile to TypeScript |

### Execute Workflow

```
POST /api/workflows/:id/execute
Content-Type: application/json

{
  "params": {
    "playerId": 1,
    "mapId": 1
  }
}
```

Response:
```json
{ "executionId": 8 }
```

The `params` object is merged into the initial workflow context. Poll the execution endpoint for status.

## Version Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflows/:id/versions` | List version history |
| GET | `/api/workflows/:id/versions/:versionId` | Get specific version snapshot |
| POST | `/api/workflows/:id/versions/:versionId/restore` | Restore definition from version |

## Execution Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workflow-executions` | List executions (filter by workflowId, status) |
| GET | `/api/workflow-executions/:id` | Get execution detail |
| POST | `/api/workflow-executions/:id/cancel` | Cancel running execution |

### Execution Detail Response

```json
{
  "id": 8,
  "workflowId": 2,
  "status": "completed",
  "context": {
    "playerId": 1,
    "mapId": 1,
    "spawnX": 16,
    "spawnY": 16,
    "sessionId": 4,
    "assignmentId": 5
  },
  "currentState": "done",
  "startedAt": "2026-02-11T01:03:20.000Z",
  "completedAt": "2026-02-11T01:03:22.000Z",
  "nodes": [
    {
      "nodeId": "checkActiveSession",
      "nodeType": "sessions.getActive",
      "status": "completed",
      "input": { "params": { "playerId": 1 } },
      "output": [{ "id": 3, "playerId": 1, "mapId": 1 }],
      "durationMs": 245
    }
  ]
}
```

## Config Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/module-configs` | List all configs |
| POST | `/api/module-configs` | Upsert config (unique: moduleName, scope, scopeId, key) |
| GET | `/api/module-configs/:id` | Get single config |
| PUT | `/api/module-configs/:id` | Update config value |
| DELETE | `/api/module-configs/:id` | Delete config |
| GET | `/api/module-configs/resolve` | Resolve with 3-tier cascade |

### Config Resolution

```
GET /api/module-configs/resolve?moduleName=maps&key=START_CELL_POSITION
```

Resolution order:
1. **Instance** — scope="instance", scopeId matches
2. **Module** — scope="module", no scopeId
3. **Schema default** — from ModuleDefinition.configSchema

Response:
```json
{
  "value": { "x": 16, "y": 16 },
  "source": "module",
  "moduleName": "maps",
  "key": "START_CELL_POSITION"
}
```

## Node Types Endpoint

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/node-types` | List all registered node types |

Returns both builtin (core.*) and dynamic (module API) node types with their input/output schemas.

## Events Emitted

| Event | Trigger |
|-------|---------|
| `workflows.workflow.created` | POST /api/workflows |
| `workflows.workflow.updated` | PUT /api/workflows/:id |
| `workflows.workflow.deleted` | DELETE /api/workflows/:id |
| `workflows.execution.started` | Execution begins |
| `workflows.execution.completed` | Execution finishes successfully |
| `workflows.execution.failed` | Execution errors |
| `workflows.node.started` | Node begins executing |
| `workflows.node.completed` | Node finishes |
| `workflows.node.failed` | Node errors |

## Unity Integration Pattern

Unity doesn't call the workflow engine directly. Instead:

1. **Start**: `POST /api/workflows/:id/execute` with params
2. **Poll**: `GET /api/workflow-executions/:id` every 2 seconds
3. **Check**: `execution.status == "completed"` → extract context
4. **Use**: `context.spawnX`, `context.spawnY`, `context.sessionId`, etc.

```csharp
// SessionsModule.cs pattern
yield return ApiClient.Post($"{url}/api/workflows/{workflowId}/execute", paramsJson,
    result => executionId = ParseExecutionId(result));

// Poll until complete
while (status != "completed" && status != "failed")
{
    yield return new WaitForSeconds(2f);
    yield return ApiClient.Get($"{url}/api/workflow-executions/{executionId}",
        result => { status = ParseStatus(result); context = ParseContext(result); });
}
```
