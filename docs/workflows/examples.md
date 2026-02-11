# Workflow Examples

> Real workflow definitions from the Oven project with detailed walkthrough.
> Last Updated: 2026-02-11

---

## Example 1: Player Spawn (`player-spawn`)

**Trigger**: Manual (from Unity client on map selection)
**Input**: `{ playerId, mapId }`
**Output**: `{ spawnX, spawnY, sessionId, assignmentId }`

### Flow

```
checkActiveSession (sessions.getActive)
  → evaluateActiveSession (always block)
    → [has session] saveOldSessionId (core.setVariable) → endOldSession (sessions.update)
    → [no session] (fall through)
  → checkLastPosition (positions.assignments.getActive)
    → evaluateLastPosition (always block)
      → [has currentTileX] useLastPosition (core.setVariable) → setSpawnY (core.setVariable)
      → [no position] resolveSpawnConfig (core.resolveConfig) → extractSpawnFromConfig (core.transform)
    → createSession (sessions.create)
      → saveSessionId (core.setVariable)
        → createAssignment (positions.assignments.create)
          → saveAssignmentId (core.setVariable)
            → done
```

### Key Details

- `checkActiveSession`: GET /api/sessions/active?playerId=X → returns **array**
- Guard: `{ key: "0", operator: "exists" }` checks if array has elements
- `endOldSession`: PUT /api/sessions/[id] with `endedAt: "now"` (server converts to Date)
- `checkLastPosition`: GET /api/map-assignments/active?playerId=X → returns **single object** or null
- Guard: `{ key: "currentTileX", operator: "exists" }` checks saved position
- Config fallback: reads `START_CELL_POSITION` config → `{x: 16, y: 16}`
- `core.setVariable` used to explicitly set `spawnX`, `spawnY`, `sessionId`, `assignmentId` on context

### Gotchas

1. `sessions.getActive` returns array → spread as `{0: item, length: N}` → use `$.0.id`
2. `positions.assignments.getActive` returns single object → spread normally → use `$.currentTileX`
3. `endedAt: "now"` is a special value handled by the sessions PUT handler
4. Seed uses `onConflictDoUpdate` to ensure definition changes apply on re-seed

---

## Example 2: Session End (`session-end`)

**Trigger**: Manual (from Unity client on ESC or TTL expiry)
**Input**: `{ playerId, sessionId, assignmentId, endTileX, endTileY, tilesTraveled, chunksLoaded }`
**Output**: Session and assignment updated

### Flow

```
updateSession (sessions.update)
  → updateAssignment (positions.assignments.update)
    → emitSessionEnded (core.emit)
      → done
```

### Key Details

- `updateSession`: PUT /api/sessions/[sessionId] with `endedAt: "now"`, endTileX/Y, stats
- `updateAssignment`: PUT /api/map-assignments/[assignmentId] with `currentTileX/Y`
- `emitSessionEnded`: Fires `sessions.session.ended` event for other modules to react

---

## Example 3: Session Resume (`session-resume`)

**Trigger**: Manual (from Unity client on startup check)
**Input**: `{ playerId }`
**Output**: `{ hasSession, sessionId, mapId, spawnX, spawnY, assignmentId }` or `{ hasSession: false }`

### Flow

```
checkActiveSession (sessions.getActive)
  → evaluateSession (always block)
    → [has session] extractSessionData (core.transform) → getAssignment (positions.assignments.getActive) → done
    → [no session] setNoSession (core.setVariable) → done
```

### Key Details

- Guard: `{ key: "0", operator: "exists" }` — checks if active session array has elements
- `extractSessionData`: Maps `$.0.id` → `sessionId`, `$.0.mapId` → `mapId`, etc.
- `getAssignment`: Fetches active assignment to get spawn position for resuming
- `setNoSession`: Sets `hasSession: false` on context — Unity checks this to skip resume

---

## Workflow Definition Format

All workflows use XState-inspired JSON with this structure:

```json
{
  "id": "workflow-name",
  "initial": "firstStateName",
  "states": {
    "firstStateName": {
      "invoke": {
        "type": "node.type",
        "input": {
          "params": { "key": "$.path" },
          "body": { "field": "$.value" },
          "pathParams": { "id": "$.entityId" }
        },
        "outputKey": "optionalOutputName"
      },
      "always": [
        {
          "target": "nextState",
          "guard": { "key": "someKey", "operator": "exists" }
        },
        { "target": "defaultState" }
      ]
    },
    "done": { "type": "final" }
  }
}
```

### Invoke Input Fields

- `params`: Query parameters for GET requests (e.g., `?playerId=1`)
- `body`: Request body for POST/PUT requests
- `pathParams`: URL path parameters (e.g., `/sessions/[id]`)

### Guard Types

- `always`: Array of guarded transitions. First match wins. Last entry without guard = default.
- Each guard: `{ key, operator, value? }` evaluated against current context.

### Special Values

- `"now"` in `endedAt` body field → server converts to `new Date()`
- `$.path` expressions in any input value → resolved from context at runtime
