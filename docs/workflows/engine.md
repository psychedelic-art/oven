# Workflow Engine

> State machine execution engine with per-node tracking and persistence.
> Last Updated: 2026-02-11

## How It Works

```
1. Load workflow definition (XState JSON format)
2. Create execution record (status: "running")
3. Iterate through states sequentially:
   a. Create node_execution record (status: "running")
   b. Resolve inputs via $.path expressions from context
   c. Execute invoke task (API call, transform, condition, etc.)
   d. Merge output into context: { ...context, [nodeId_output]: output, ...output }
   e. Evaluate guards for transition selection
   f. Update node_execution (status: "completed", output, duration)
   g. Transition to next state
4. Mark execution as "completed" with final context
```

## Execution Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `network` | Makes real HTTP API calls | Production (Unity integration) |
| `direct` | In-process function calls | Future optimization |
| `none` | Simulation / dry run | Testing |

## Node Types

### Core (Builtin)

| Node | Purpose | Input |
|------|---------|-------|
| `core.setVariable` | Set a value directly on context | `key`, `value` |
| `core.transform` | Map values via $.path expressions | `mapping: { outKey: "$.path" }` |
| `core.resolveConfig` | 3-tier config cascade lookup | `moduleName`, `key`, `scopeId?` |
| `core.emit` | Fire event on EventBus | `event`, `payload` |
| `core.sql` | Raw SQL execution (limited) | `query`, `params` |
| `core.log` | Debug logging | `message`, `level` |
| `core.delay` | Wait N milliseconds | `duration` |

### Dynamic (Auto-registered from Module APIs)

Each module's API endpoints are auto-discovered and registered as workflow node types:

**Sessions module**:
- `sessions.getActive` — GET /api/sessions/active
- `sessions.create` — POST /api/sessions
- `sessions.update` — PUT /api/sessions/[id]

**Player Map Position module**:
- `positions.assignments.getActive` — GET /api/map-assignments/active
- `positions.assignments.create` — POST /api/map-assignments
- `positions.assignments.update` — PUT /api/map-assignments/[id]

**Maps module**:
- `maps.getAll` — GET /api/maps
- `maps.chunks.get` — GET /api/maps/[id]/chunks

*(All module API endpoints are auto-registered via the node registry)*

## Transform Language ($.path Expressions)

The `resolveValue(expr, context)` function evaluates `$.path` expressions against the workflow context:

```
$.playerId          → context.playerId (direct property)
$.0.id              → context["0"].id (array element after spread)
$.spawnX            → context.spawnX
$.checkActive_output → output of the "checkActive" node
```

### How API Responses Merge into Context

When a node invokes an API call, the response merges into context:

**Array responses** get spread as numbered keys:
```javascript
// GET /api/sessions/active returns [{ id: 4, playerId: 1 }]
// Context becomes:
{ ...previousContext, "0": { id: 4, playerId: 1 }, length: 1 }
// Access via: $.0.id
```

**Single object responses** spread normally:
```javascript
// GET /api/map-assignments/active returns { id: 5, currentTileX: 20 }
// Context becomes:
{ ...previousContext, id: 5, currentTileX: 20 }
// Access via: $.currentTileX
```

### Guard Evaluation

Guards control transitions between states:

```javascript
evaluateCondition({ key, operator, value }, context)
```

| Operator | Meaning |
|----------|---------|
| `==` | Equals (loose) |
| `!=` | Not equals |
| `>`, `<`, `>=`, `<=` | Numeric comparison |
| `contains` | String/array contains |
| `exists` | Key exists and is not null/undefined |

Example guards:
```json
{ "key": "0", "operator": "exists" }           // Array has at least one element
{ "key": "currentTileX", "operator": "exists" } // Assignment has saved position
{ "key": "hasSession", "operator": "==", "value": true }
```

## Error Handling

- Per-node error catching: if a node fails, its `node_execution` is marked "failed"
- The workflow execution is marked "failed" with the error message
- No automatic retry — the workflow stops at the failed node
- Context up to the failure point is preserved in the execution record

## Execution Flow Details

### State Definition Format

```json
{
  "stateName": {
    "invoke": {
      "type": "sessions.getActive",
      "input": {
        "params": { "playerId": "$.playerId" }
      },
      "outputKey": "activeSession"
    },
    "always": [
      {
        "target": "hasSession",
        "guard": { "key": "0", "operator": "exists" }
      },
      { "target": "noSession" }
    ]
  }
}
```

- `invoke.type`: Node type from registry
- `invoke.input`: Parameters resolved via $.path expressions
- `invoke.outputKey`: Key for storing output in context (also auto-stored as `{stateId}_output`)
- `always`: Guard-based transitions (first matching guard wins; last entry = default)
